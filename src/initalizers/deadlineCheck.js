import { load, save } from "../utils/storage.js";
import {
  DEADLINES_KEY,
  DEADLINE_NOTIFIED_KEY,
  DEADLINE_SETTINGS_KEY,
  DEADLINE_SYNC_STATUS_KEY,
  RESOURCES_KEY,
} from "../utils/storageKeys.js";
import {
  CONTENT_TYPE_IDS,
  fetchPesu,
  getAssignmentMaterialsMeta,
  getCourseMaterials,
  isPesuSessionExpiredError,
  parseDispositionFilename,
} from "../helpers/pesuAPI.js";
import { parseDownloadLinks, resolveDownloadUrl } from "../helpers/parser.js";
import { probeSession } from "../helpers/academyAuth.js";
import { parallelBatch } from "../helpers/MiscControllers.js";
import { blobToDataUrl } from "../helpers/blobEncoding.js";
import {
  DAY_MS,
  HOUR_MS,
  computeBadgeSummary,
  extractCachedAssignmentsFromPesuData,
  extractDeadlineFromHtml,
  extractDeadlineFromText,
  isActiveForBadge,
  resolveCurrentSemesterNumber,
  sortDeadlines,
} from "../helpers/deadlineParser.js";

export const DEADLINE_CHECK_ALARM = "checkAssignmentDeadlines";
export const DEADLINE_SYNC_ALARM = "syncAssignmentDeadlines";
export const DEADLINE_REMINDER_PREFIX = "deadlineReminder:";

const DEADLINE_CHECK_PERIOD_MINUTES = 15;
const DEADLINE_SYNC_PERIOD_MINUTES = 60;
const DEADLINE_SYNC_INTERVAL_MS = 60 * 60 * 1000;
const CLASS_RESCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_SCHEDULED_REMINDERS = 50;
const MAX_NOTIFIED_ENTRIES = 500;

export const DEFAULT_DEADLINE_SETTINGS = {
  notificationsEnabled: true,
  leadHours: [24, 6, 1],
  overdueReminder: true,
};

let storeLockChain = Promise.resolve();
let academySyncInFlight = null;

function withDeadlinesStoreLock(fn) {
  const run = storeLockChain.then(fn, fn);
  storeLockChain = run.catch(() => {});
  return run;
}

function sanitizeSettings(raw) {
  const leadHours = Array.isArray(raw?.leadHours)
    ? [...new Set(raw.leadHours.map(Number).filter((h) => Number.isFinite(h) && h > 0 && h <= 168))].sort((a, b) => b - a)
    : DEFAULT_DEADLINE_SETTINGS.leadHours;

  return {
    notificationsEnabled: raw?.notificationsEnabled !== false,
    leadHours: leadHours.length > 0 ? leadHours : [],
    overdueReminder: raw?.overdueReminder !== false,
  };
}

export async function getDeadlineSettings() {
  const stored = await load(DEADLINE_SETTINGS_KEY).catch(() => null);
  return sanitizeSettings(stored);
}

async function loadDeadlinesStore() {
  const stored = await load(DEADLINES_KEY).catch(() => null);
  return {
    items: stored?.items && typeof stored.items === "object" ? { ...stored.items } : {},
    scannedClasses:
      stored?.scannedClasses && typeof stored.scannedClasses === "object"
        ? { ...stored.scannedClasses }
        : {},
    lastSyncedAt: stored?.lastSyncedAt || null,
  };
}

async function saveDeadlinesStore(store) {
  await save(DEADLINES_KEY, store);
  const visibleItems = getVisibleDeadlinesFromStore(store);
  updateActionBadge(visibleItems);
  return visibleItems;
}

export function getVisibleDeadlinesFromStore(store) {
  const items = Object.values(store?.items || {}).filter((item) => item && !item.dismissed);
  return sortDeadlines(items);
}

export function updateActionBadge(items = [], now = Date.now()) {
  try {
    if (!chrome?.action?.setBadgeText) return;
    const summary = computeBadgeSummary(items, now);
    const text = summary.badgeCount > 0 ? String(Math.min(summary.badgeCount, 99)) : "";
    chrome.action.setBadgeText({ text });
    if (chrome.action.setBadgeBackgroundColor) {
      chrome.action.setBadgeBackgroundColor({
        color: summary.overdueCount > 0 ? "#e53935" : "#f5821f",
      });
    }
  } catch (err) {
    console.warn("[Deadlines] Failed to update action badge:", err);
  }
}

function mergeSinglePesuItem(existing, incoming, now) {
  if (!existing) {
    return {
      ...incoming,
      completed: false,
      completedAt: null,
      notes: "",
      dismissed: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  const keepManualDate = existing.dueDateSource === "manual";
  const keepExistingParsedDate = existing.dueAt != null && incoming.dueAt == null;
  const dueAt = keepManualDate || keepExistingParsedDate ? existing.dueAt : incoming.dueAt;
  const dueDateSource = keepManualDate
    ? "manual"
    : keepExistingParsedDate
      ? existing.dueDateSource
      : incoming.dueDateSource;
  const hasTime = keepManualDate || keepExistingParsedDate ? existing.hasTime : incoming.hasTime;
  const rawDateText =
    keepManualDate || keepExistingParsedDate ? existing.rawDateText : incoming.rawDateText;

  const files = incoming.files?.length > 0 ? incoming.files : existing.files || [];

  const title = existing.titleEdited
    ? existing.title
    : files.length === 1 && files[0]?.name && !/^assignments?$/i.test(files[0].name)
      ? files[0].name
      : existing.title && existing.title !== existing.className && incoming.title === incoming.className
        ? existing.title
        : incoming.title;

  return {
    ...existing,
    ...incoming,
    title,
    dueAt,
    dueDateSource,
    hasTime,
    rawDateText,
    files,
    completed: Boolean(existing.completed),
    completedAt: existing.completedAt || null,
    notes: existing.notes || "",
    dismissed: Boolean(existing.dismissed),
    titleEdited: Boolean(existing.titleEdited),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

export function syncDeadlinesFromCache() {
  return withDeadlinesStoreLock(async () => {
    const [pesuData, resourcesData, userProfile, semestersData, store] = await Promise.all([
      load("pesuData").catch(() => null),
      load(RESOURCES_KEY).catch(() => null),
      load("userProfile").catch(() => null),
      load("semestersData").catch(() => null),
      loadDeadlinesStore(),
    ]);

    const currentSemester = resolveCurrentSemesterNumber(userProfile, semestersData);
    const extracted = extractCachedAssignmentsFromPesuData(pesuData, resourcesData, {
      currentSemester,
      onlyCurrentSemester: false,
    });

    const now = Date.now();
    let changed = false;

    for (const incoming of extracted) {
      const existing = store.items[incoming.id];
      const merged = mergeSinglePesuItem(existing, incoming, now);
      if (
        !existing ||
        existing.isCurrentSemester !== merged.isCurrentSemester ||
        existing.assignmentCount !== merged.assignmentCount ||
        existing.dueAt !== merged.dueAt ||
        existing.title !== merged.title ||
        (existing.files?.length || 0) !== (merged.files?.length || 0)
      ) {
        store.items[incoming.id] = merged;
        changed = true;
      }
    }

    // Re-evaluate current semester flag on all existing PESU items
    if (currentSemester != null) {
      for (const item of Object.values(store.items)) {
        if (item?.source === "pesu" && item.semester != null) {
          const nextIsCurrent = item.semester === currentSemester;
          if (item.isCurrentSemester !== nextIsCurrent) {
            item.isCurrentSemester = nextIsCurrent;
            changed = true;
          }
        }
      }
    }

    const items = changed ? await saveDeadlinesStore(store) : getVisibleDeadlinesFromStore(store);
    if (!changed) {
      updateActionBadge(items);
    }
    return { items, store };
  });
}

export async function isDeadlineSyncDue() {
  const store = await loadDeadlinesStore();
  return !store.lastSyncedAt || Date.now() - store.lastSyncedAt >= DEADLINE_SYNC_INTERVAL_MS;
}

export async function syncDeadlinesWithAcademy({ force = false } = {}) {
  if (academySyncInFlight) {
    return academySyncInFlight;
  }

  academySyncInFlight = (async () => {
    await save(DEADLINE_SYNC_STATUS_KEY, {
      syncing: true,
      lastSyncedAt: (await loadDeadlinesStore()).lastSyncedAt,
      lastError: null,
    });

    try {
      const { store } = await syncDeadlinesFromCache();
      const [pesuData, userProfile, semestersData] = await Promise.all([
        load("pesuData").catch(() => null),
        load("userProfile").catch(() => null),
        load("semestersData").catch(() => null),
      ]);

      const currentSemester = resolveCurrentSemesterNumber(userProfile, semestersData);
      const now = Date.now();

      const candidateItems = Object.values(store.items).filter((item) => {
        if (!item || item.source !== "pesu" || item.dismissed) return false;
        if (currentSemester != null && item.semester != null && item.semester !== currentSemester) {
          return false;
        }
        const scanInfo = store.scannedClasses[item.classId];
        if (force || !scanInfo) return true;
        if (scanInfo.count !== item.assignmentCount) return true;
        // Re-scan items missing a due date after cooldown in case portal text updated.
        if (!item.dueAt && now - (scanInfo.scannedAt || 0) >= CLASS_RESCAN_INTERVAL_MS) {
          return true;
        }
        return false;
      });

      const scanResults = new Map();
      const scannedClasses = {};

      if (candidateItems.length > 0 && pesuData?.subjects) {
        const sessionValid = await probeSession().catch(() => false);
        if (sessionValid) {
          await parallelBatch(
            candidateItems,
            async (item) => {
              try {
                const meta = await getAssignmentMaterialsMeta(
                  item.subjectId,
                  item.unitId,
                  item.classId,
                  item.classNo
                );

                const contentParsed = extractDeadlineFromHtml(meta.contentHtml, { now });
                const viewParsed = extractDeadlineFromHtml(meta.viewHtml, { now });

                const combinedFilesMap = new Map();
                for (const file of [...contentParsed.files, ...viewParsed.files]) {
                  if (file.url && !combinedFilesMap.has(file.url)) {
                    combinedFilesMap.set(file.url, file);
                  }
                }
                if (meta.filename && combinedFilesMap.size === 0) {
                  combinedFilesMap.set("direct", {
                    docId: `${item.classId}:${CONTENT_TYPE_IDS.assignments}`,
                    name: meta.filename,
                    url: null,
                  });
                }
                const files = Array.from(combinedFilesMap.values());

                let detectedDeadline = contentParsed.deadline || viewParsed.deadline;
                if (!detectedDeadline && meta.filename) {
                  detectedDeadline = extractDeadlineFromText(meta.filename, {
                    now,
                    allowUnanchoredDate: true,
                    allowYearless: false,
                  });
                }

                scanResults.set(item.id, {
                  detectedDeadline,
                  files,
                  titleHint: contentParsed.titleHint || null,
                });
                scannedClasses[item.classId] = {
                  count: item.assignmentCount,
                  scannedAt: Date.now(),
                  hadDeadline: Boolean(detectedDeadline),
                };
              } catch (err) {
                if (isPesuSessionExpiredError(err)) {
                  throw err;
                }
                console.warn(`[Deadlines] Failed to scan class ${item.classId}:`, err);
              }
            },
            3
          );
        }
      }

      const { items, lastSyncedAt } = await withDeadlinesStoreLock(async () => {
        const latestStore = await loadDeadlinesStore();

        for (const [id, result] of scanResults.entries()) {
          const existing = latestStore.items[id];
          if (!existing) continue;

          const keepManual = existing.dueDateSource === "manual";
          const { detectedDeadline, files, titleHint } = result;
          const nextDueAt = keepManual
            ? existing.dueAt
            : detectedDeadline?.dueAt ?? existing.dueAt ?? null;
          const nextDueDateSource = keepManual
            ? "manual"
            : detectedDeadline
              ? "parsed"
              : existing.dueDateSource || "none";
          const nextHasTime = keepManual
            ? existing.hasTime
            : detectedDeadline?.hasTime ?? existing.hasTime ?? false;
          const nextRawDateText = keepManual
            ? existing.rawDateText
            : detectedDeadline?.rawDateText ?? existing.rawDateText ?? null;

          const betterTitle =
            existing.titleEdited
              ? existing.title
              : titleHint ||
                (files.length === 1 && files[0]?.name && !/^assignments?$/i.test(files[0].name)
                  ? files[0].name
                  : null) ||
                existing.title;

          latestStore.items[id] = {
            ...existing,
            title: betterTitle,
            dueAt: nextDueAt,
            dueDateSource: nextDueDateSource,
            hasTime: nextHasTime,
            rawDateText: nextRawDateText,
            files: files.length > 0 ? files : existing.files || [],
            updatedAt: Date.now(),
          };
        }

        Object.assign(latestStore.scannedClasses, scannedClasses);
        latestStore.lastSyncedAt = Date.now();
        const savedItems = await saveDeadlinesStore(latestStore);
        return { items: savedItems, lastSyncedAt: latestStore.lastSyncedAt };
      });

      await save(DEADLINE_SYNC_STATUS_KEY, {
        syncing: false,
        lastSyncedAt,
        lastError: null,
      });

      await scheduleNextDeadlineAlarms();
      await checkAndNotifyDeadlines();

      return items;
    } catch (err) {
      const message = err?.message || "Failed to sync assignment deadlines";
      await save(DEADLINE_SYNC_STATUS_KEY, {
        syncing: false,
        lastSyncedAt: (await loadDeadlinesStore()).lastSyncedAt,
        lastError: message,
      });
      throw err;
    } finally {
      academySyncInFlight = null;
    }
  })();

  return academySyncInFlight;
}

export async function getAllDeadlinesPayload() {
  const [{ items }, settings, syncStatus] = await Promise.all([
    syncDeadlinesFromCache(),
    getDeadlineSettings(),
    load(DEADLINE_SYNC_STATUS_KEY).catch(() => null),
  ]);

  return {
    items,
    settings,
    syncStatus: syncStatus || { syncing: false, lastSyncedAt: null, lastError: null },
  };
}

export async function saveCustomDeadline(payload) {
  const items = await withDeadlinesStoreLock(async () => {
    const store = await loadDeadlinesStore();
    const now = Date.now();
    const id = payload.id || `custom:${now}:${Math.random().toString(36).slice(2, 7)}`;
    const existing = store.items[id];

    const nextItem = {
      id,
      source: "custom",
      subjectId: payload.subjectId || null,
      subjectCode: (payload.subjectCode || "").trim(),
      subjectName: (payload.subjectName || "").trim(),
      semester: payload.semester ?? null,
      isCurrentSemester: true,
      unitId: null,
      unitName: "",
      classId: null,
      classNo: "",
      className: "",
      assignmentCount: 1,
      title: (payload.title || "").trim() || "Untitled Deadline",
      dueAt: payload.dueAt ?? null,
      dueDateSource: payload.dueAt != null ? "manual" : "none",
      hasTime: Boolean(payload.hasTime),
      rawDateText: null,
      files: [],
      completed: existing ? Boolean(existing.completed) : false,
      completedAt: existing?.completedAt || null,
      notes: (payload.notes || "").trim(),
      dismissed: false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    store.items[id] = nextItem;
    if (existing && existing.dueAt !== nextItem.dueAt) {
      await clearNotifiedEventsForDeadline(id);
    }

    return saveDeadlinesStore(store);
  });

  await scheduleNextDeadlineAlarms();
  await checkAndNotifyDeadlines();
  return items;
}

export async function updateDeadlineItem(id, patch) {
  const items = await withDeadlinesStoreLock(async () => {
    const store = await loadDeadlinesStore();
    const existing = store.items[id];
    if (!existing) {
      throw new Error("Deadline not found");
    }

    const dueChanged = patch.dueAt !== undefined && patch.dueAt !== existing.dueAt;
    const nextDueAt = patch.dueAt !== undefined ? patch.dueAt : existing.dueAt;

    const updated = {
      ...existing,
      ...(patch.title !== undefined
        ? { title: patch.title.trim() || existing.title, titleEdited: true }
        : {}),
      ...(patch.subjectCode !== undefined ? { subjectCode: patch.subjectCode.trim() } : {}),
      ...(patch.subjectName !== undefined ? { subjectName: patch.subjectName.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.dueAt !== undefined
        ? {
            dueAt: nextDueAt,
            dueDateSource: nextDueAt != null ? "manual" : "none",
            hasTime: patch.hasTime !== undefined ? Boolean(patch.hasTime) : existing.hasTime,
            rawDateText: nextDueAt != null ? existing.rawDateText : null,
          }
        : {}),
      ...(patch.completed !== undefined
        ? {
            completed: Boolean(patch.completed),
            completedAt: patch.completed ? Date.now() : null,
          }
        : {}),
      ...(patch.dismissed !== undefined ? { dismissed: Boolean(patch.dismissed) } : {}),
      updatedAt: Date.now(),
    };

    store.items[id] = updated;

    if (dueChanged) {
      await clearNotifiedEventsForDeadline(id);
    }

    return saveDeadlinesStore(store);
  });

  await scheduleNextDeadlineAlarms();
  await checkAndNotifyDeadlines();
  return items;
}

export async function deleteDeadlineItem(id) {
  const items = await withDeadlinesStoreLock(async () => {
    const store = await loadDeadlinesStore();
    const existing = store.items[id];
    if (!existing) {
      return getVisibleDeadlinesFromStore(store);
    }

    if (existing.source === "custom") {
      delete store.items[id];
    } else {
      store.items[id] = {
        ...existing,
        dismissed: true,
        updatedAt: Date.now(),
      };
    }

    await clearNotifiedEventsForDeadline(id);
    return saveDeadlinesStore(store);
  });

  await scheduleNextDeadlineAlarms();
  return items;
}

export async function updateDeadlineSettings(nextSettings) {
  const sanitized = sanitizeSettings(nextSettings);
  await save(DEADLINE_SETTINGS_KEY, sanitized);
  await scheduleNextDeadlineAlarms();
  await checkAndNotifyDeadlines();
  return sanitized;
}

async function loadNotifiedMap() {
  const map = await load(DEADLINE_NOTIFIED_KEY).catch(() => null);
  return map && typeof map === "object" ? { ...map } : {};
}

async function saveNotifiedMap(map) {
  const entries = Object.entries(map);
  if (entries.length > MAX_NOTIFIED_ENTRIES) {
    entries.sort((a, b) => b[1] - a[1]);
    return save(DEADLINE_NOTIFIED_KEY, Object.fromEntries(entries.slice(0, MAX_NOTIFIED_ENTRIES)));
  }
  return save(DEADLINE_NOTIFIED_KEY, map);
}

async function clearNotifiedEventsForDeadline(deadlineId) {
  const map = await loadNotifiedMap();
  const prefix = `${deadlineId}:`;
  let changed = false;
  for (const key of Object.keys(map)) {
    if (key.startsWith(prefix)) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) {
    await saveNotifiedMap(map);
  }
}

function formatRemainingShort(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function formatDueDateLabel(dueAt, hasTime) {
  const date = new Date(dueAt);
  if (hasTime) {
    return date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function emitBrowserNotification(id, title, message) {
  return new Promise((resolve) => {
    try {
      if (!chrome?.notifications?.create) {
        resolve(false);
        return;
      }
      const iconUrl = chrome.runtime?.getURL
        ? chrome.runtime.getURL("icons/icon128.png")
        : "icons/icon128.png";

      chrome.notifications.create(
        id,
        {
          type: "basic",
          iconUrl,
          title,
          message,
          priority: 2,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn("[Deadlines] Notification error:", chrome.runtime.lastError.message);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    } catch (err) {
      console.warn("[Deadlines] Failed to create notification:", err);
      resolve(false);
    }
  });
}

export async function sendTestDeadlineNotification() {
  const ok = await emitBrowserNotification(
    `pesu-max-deadline-test-${Date.now()}`,
    "PESU-MAX Deadline Reminder",
    "Browser deadline notifications are working! You will be alerted before assignments are due."
  );
  if (!ok) {
    throw new Error("Chrome notifications are unavailable or disabled in browser settings.");
  }
  return true;
}

export async function checkAndNotifyDeadlines({ now = Date.now() } = {}) {
  const [store, settings, notifiedMap] = await Promise.all([
    loadDeadlinesStore(),
    getDeadlineSettings(),
    loadNotifiedMap(),
  ]);

  const visibleItems = getVisibleDeadlinesFromStore(store);
  updateActionBadge(visibleItems, now);

  if (!settings.notificationsEnabled) {
    return;
  }

  const ascLeadHours = [...settings.leadHours].sort((a, b) => a - b);
  let notifiedChanged = false;

  for (const item of visibleItems) {
    if (!isActiveForBadge(item) || item.dueAt == null) continue;

    const remaining = item.dueAt - now;
    const coursePrefix = item.subjectCode ? `[${item.subjectCode}] ` : "";

    if (remaining > 0) {
      const matchedHour = ascLeadHours.find((h) => remaining <= h * HOUR_MS);
      if (matchedHour != null) {
        const eventKey = `${item.id}:lead:${matchedHour}h`;
        if (!notifiedMap[eventKey]) {
          await emitBrowserNotification(
            `deadline:${eventKey}`,
            `${coursePrefix}Due in ${formatRemainingShort(remaining)}`,
            `${item.title} — Due ${formatDueDateLabel(item.dueAt, item.hasTime)}`
          );
          for (const h of ascLeadHours) {
            if (h >= matchedHour) {
              notifiedMap[`${item.id}:lead:${h}h`] = now;
            }
          }
          notifiedChanged = true;
        }
      }
    } else if (settings.overdueReminder && now - item.dueAt <= 7 * DAY_MS) {
      const overdueKey = `${item.id}:overdue`;
      if (!notifiedMap[overdueKey]) {
        await emitBrowserNotification(
          `deadline:${overdueKey}`,
          `${coursePrefix}Assignment Overdue`,
          `${item.title} was due ${formatDueDateLabel(item.dueAt, item.hasTime)}`
        );
        notifiedMap[overdueKey] = now;
        notifiedChanged = true;
      }
    }
  }

  if (notifiedChanged) {
    await saveNotifiedMap(notifiedMap);
  }
}

export async function scheduleNextDeadlineAlarms() {
  try {
    if (!chrome?.alarms?.getAll) return;

    const existingAlarms = await new Promise((resolve) =>
      chrome.alarms.getAll((list) => resolve(list || []))
    );

    for (const alarm of existingAlarms) {
      if (alarm.name.startsWith(DEADLINE_REMINDER_PREFIX)) {
        chrome.alarms.clear(alarm.name);
      }
    }

    const [store, settings, notifiedMap] = await Promise.all([
      loadDeadlinesStore(),
      getDeadlineSettings(),
      loadNotifiedMap(),
    ]);

    if (!settings.notificationsEnabled) return;

    const now = Date.now();
    const visibleItems = getVisibleDeadlinesFromStore(store);
    const candidates = [];

    for (const item of visibleItems) {
      if (!isActiveForBadge(item) || item.dueAt == null) continue;

      for (const h of settings.leadHours) {
        const triggerAt = item.dueAt - h * HOUR_MS;
        const key = `${item.id}:lead:${h}h`;
        if (triggerAt > now + 60_000 && triggerAt - now <= 7 * DAY_MS && !notifiedMap[key]) {
          candidates.push({
            name: `${DEADLINE_REMINDER_PREFIX}${item.id}:lead:${h}`,
            when: triggerAt,
          });
        }
      }

      if (
        settings.overdueReminder &&
        item.dueAt > now + 60_000 &&
        item.dueAt - now <= 7 * DAY_MS &&
        !notifiedMap[`${item.id}:overdue`]
      ) {
        candidates.push({
          name: `${DEADLINE_REMINDER_PREFIX}${item.id}:overdue`,
          when: item.dueAt,
        });
      }
    }

    candidates.sort((a, b) => a.when - b.when);
    for (const alarm of candidates.slice(0, MAX_SCHEDULED_REMINDERS)) {
      chrome.alarms.create(alarm.name, { when: alarm.when });
    }
  } catch (err) {
    console.warn("[Deadlines] Failed to schedule alarms:", err);
  }
}

export async function downloadAssignmentFile({ url, filename, subjectId, unitId, classId, classNo }) {
  let targetUrl = url ? resolveDownloadUrl(url) : null;
  let blob = null;
  let resolvedName = filename || "assignment.pdf";

  if (targetUrl) {
    const response = await fetchPesu(targetUrl, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }
    const dispositionName = parseDispositionFilename(response.headers.get("Content-Disposition") || "");
    if (dispositionName) resolvedName = dispositionName;
    blob = await response.blob();
  } else if (subjectId && unitId && classId) {
    const result = await getCourseMaterials(
      subjectId,
      unitId,
      classId,
      classNo || "1",
      CONTENT_TYPE_IDS.assignments
    );
    if (result?.type === "binary" && result.data) {
      blob = result.data;
    } else if (result?.type === "html" && result.data) {
      const links = parseDownloadLinks(result.data);
      if (links.length === 0) {
        throw new Error("No downloadable assignment file found");
      }
      const first = links[0];
      const resp = await fetchPesu(resolveDownloadUrl(first.url), {
        method: "GET",
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
      const dispositionName = parseDispositionFilename(resp.headers.get("Content-Disposition") || "");
      resolvedName = dispositionName || first.name || resolvedName;
      blob = await resp.blob();
    }
  }

  if (!blob) {
    throw new Error("Assignment file could not be downloaded");
  }

  const safeName = resolvedName.replace(/[<>:"/\\|?*]/g, "_").trim() || "assignment.pdf";
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(safeName);
  const finalName = hasExt ? safeName : `${safeName}.pdf`;
  const dataUrl = await blobToDataUrl(blob, blob.type || "application/octet-stream");

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: finalName,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ downloadId, filename: finalName });
      }
    );
  });
}

export function ensureDeadlineAlarms() {
  chrome.alarms.get(DEADLINE_CHECK_ALARM, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(DEADLINE_CHECK_ALARM, {
        periodInMinutes: DEADLINE_CHECK_PERIOD_MINUTES,
      });
    }
  });

  chrome.alarms.get(DEADLINE_SYNC_ALARM, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(DEADLINE_SYNC_ALARM, {
        periodInMinutes: DEADLINE_SYNC_PERIOD_MINUTES,
      });
    }
  });
}

export async function handleDeadlineAlarm(alarm) {
  if (!alarm?.name) return;

  if (alarm.name === DEADLINE_CHECK_ALARM || alarm.name.startsWith(DEADLINE_REMINDER_PREFIX)) {
    await checkAndNotifyDeadlines();
    await scheduleNextDeadlineAlarms();
    return;
  }

  if (alarm.name === DEADLINE_SYNC_ALARM) {
    if (await isDeadlineSyncDue()) {
      await syncDeadlinesWithAcademy().catch((err) =>
        console.warn("[Deadlines] Hourly sync skipped:", err?.message || err)
      );
    }
  }
}

export function initializeDeadlineTracker() {
  ensureDeadlineAlarms();

  chrome.runtime.onInstalled.addListener(() => {
    ensureDeadlineAlarms();
    syncDeadlinesFromCache().then(() => scheduleNextDeadlineAlarms()).catch(() => {});
  });

  chrome.runtime.onStartup.addListener(() => {
    ensureDeadlineAlarms();
    syncDeadlinesFromCache()
      .then(() => Promise.all([checkAndNotifyDeadlines(), scheduleNextDeadlineAlarms()]))
      .catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.pesuData || changes[RESOURCES_KEY] || changes.userProfile) {
      syncDeadlinesFromCache()
        .then(() => scheduleNextDeadlineAlarms())
        .catch(() => {});
    }
  });

  chrome.notifications?.onClicked?.addListener((notificationId) => {
    if (!String(notificationId).startsWith("deadline:") && !String(notificationId).startsWith("pesu-max-deadline")) {
      return;
    }

    chrome.tabs.query({ url: "https://www.pesuacademy.com/*" }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const targetTab = tabs[0];
        chrome.tabs.update(targetTab.id, { active: true });
        if (targetTab.windowId != null) {
          chrome.windows.update(targetTab.windowId, { focused: true });
        }
        chrome.tabs.sendMessage(targetTab.id, { action: "openDeadlinesPage" }, () => {
          void chrome.runtime.lastError;
        });
      } else {
        chrome.tabs.create({ url: "https://www.pesuacademy.com/Academy/" });
      }
    });
  });

  // Hydrate cache and badge immediately on worker startup.
  syncDeadlinesFromCache()
    .then(() => Promise.all([checkAndNotifyDeadlines(), scheduleNextDeadlineAlarms()]))
    .catch(() => {});
}

