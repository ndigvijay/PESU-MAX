import {
  DEADLINES_KEY,
  DEADLINE_SETTINGS_KEY,
  DEADLINE_SYNC_STATUS_KEY,
  RESOURCES_KEY,
} from "../utils/storageKeys.js";
import {
  inferSemesterFromCode,
  mergePesuDataIntoStore,
  resolveCurrentSemesterNumber,
  sanitizeDeadlineSettings,
  sortDeadlines,
} from "../helpers/deadlineUtils.js";

const PORT_DISCONNECTED_REGEX =
  /message port closed|receiving end does not exist|extension context invalidated/i;

const WORKER_RELOAD_HINT =
  "Background service worker did not respond. Reload PESU-MAX in chrome://extensions (or edge://extensions) to enable background alarms & HTML due-date scanning.";

function isPortDisconnectedError(err) {
  return PORT_DISCONNECTED_REGEX.test(err?.message || "");
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result || {});
    });
  });
}

function storageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response?.data ?? null);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function visibleFromStore(store) {
  const items = Object.values(store?.items || {}).filter((item) => item && !item.dismissed);
  return sortDeadlines(items);
}

async function readLocalStore() {
  const data = await storageGet([
    DEADLINES_KEY,
    DEADLINE_SETTINGS_KEY,
    DEADLINE_SYNC_STATUS_KEY,
    "pesuData",
    RESOURCES_KEY,
    "userProfile",
    "semestersData",
  ]);
  const raw = data[DEADLINES_KEY];
  const store = {
    items: raw?.items && typeof raw.items === "object" ? { ...raw.items } : {},
    scannedClasses:
      raw?.scannedClasses && typeof raw.scannedClasses === "object" ? { ...raw.scannedClasses } : {},
    lastSyncedAt: raw?.lastSyncedAt || null,
  };
  return { data, store };
}

async function localSyncFromCache() {
  const { data, store } = await readLocalStore();
  const changed = mergePesuDataIntoStore(
    store,
    data.pesuData,
    data[RESOURCES_KEY],
    data.userProfile,
    data.semestersData
  );
  if (changed) {
    await storageSet({ [DEADLINES_KEY]: store });
  }
  return {
    items: visibleFromStore(store),
    settings: sanitizeDeadlineSettings(data[DEADLINE_SETTINGS_KEY]),
    syncStatus: data[DEADLINE_SYNC_STATUS_KEY] || {
      syncing: false,
      lastSyncedAt: store.lastSyncedAt,
      lastError: null,
    },
    workerWarning: WORKER_RELOAD_HINT,
  };
}

async function localSaveCustomDeadline(payload = {}) {
  const { store } = await readLocalStore();
  const now = Date.now();
  const id = payload.id || `custom:${now}:${Math.random().toString(36).slice(2, 7)}`;
  const existing = store.items[id];

  store.items[id] = {
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

  await storageSet({ [DEADLINES_KEY]: store });
  return { items: visibleFromStore(store), workerWarning: WORKER_RELOAD_HINT };
}

async function localUpdateDeadline(id, patch = {}) {
  const { store } = await readLocalStore();
  const existing = store.items[id];
  if (!existing) {
    throw new Error("Deadline not found");
  }

  const nextDueAt = patch.dueAt !== undefined ? patch.dueAt : existing.dueAt;
  store.items[id] = {
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

  await storageSet({ [DEADLINES_KEY]: store });
  return { items: visibleFromStore(store), workerWarning: WORKER_RELOAD_HINT };
}

async function localDeleteDeadline(id) {
  const { store } = await readLocalStore();
  const existing = store.items[id];
  if (!existing) {
    return { items: visibleFromStore(store), workerWarning: WORKER_RELOAD_HINT };
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

  await storageSet({ [DEADLINES_KEY]: store });
  return { items: visibleFromStore(store), workerWarning: WORKER_RELOAD_HINT };
}

async function localUpdateSettings(nextSettings = {}) {
  const sanitized = sanitizeDeadlineSettings(nextSettings);
  await storageSet({ [DEADLINE_SETTINGS_KEY]: sanitized });
  return { settings: sanitized, workerWarning: WORKER_RELOAD_HINT };
}

export const getDeadlines = async () => {
  try {
    return await sendMessage({ action: "getDeadlines" });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localSyncFromCache();
    }
    throw err;
  }
};

export const syncDeadlines = async (force = false) => {
  try {
    return await sendMessage({ action: "syncDeadlines", force });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localSyncFromCache();
    }
    throw err;
  }
};

export const saveCustomDeadline = async (deadline) => {
  try {
    return await sendMessage({ action: "saveCustomDeadline", deadline });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localSaveCustomDeadline(deadline);
    }
    throw err;
  }
};

export const updateDeadline = async (id, patch) => {
  try {
    return await sendMessage({ action: "updateDeadline", id, patch });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localUpdateDeadline(id, patch);
    }
    throw err;
  }
};

export const deleteDeadline = async (id) => {
  try {
    return await sendMessage({ action: "deleteDeadline", id });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localDeleteDeadline(id);
    }
    throw err;
  }
};

export const updateDeadlineSettings = async (settings) => {
  try {
    return await sendMessage({ action: "updateDeadlineSettings", settings });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      return localUpdateSettings(settings);
    }
    throw err;
  }
};

export const testDeadlineNotification = async () => {
  try {
    return await sendMessage({ action: "testDeadlineNotification" });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      throw new Error(WORKER_RELOAD_HINT);
    }
    throw err;
  }
};

export const downloadDeadlineFile = async (file) => {
  try {
    return await sendMessage({ action: "downloadDeadlineFile", file });
  } catch (err) {
    if (isPortDisconnectedError(err)) {
      throw new Error(WORKER_RELOAD_HINT);
    }
    throw err;
  }
};

export const getEnrolledCourseOptions = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pesuData", "userProfile", "semestersData"], (result) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      const subjects = Object.values(result?.pesuData?.subjects || {});
      const currentSem = resolveCurrentSemesterNumber(result?.userProfile, result?.semestersData);
      const filtered = currentSem != null
        ? subjects.filter((s) => {
            const sem = s.semester ?? inferSemesterFromCode(s.subjectCode);
            return sem == null || sem === currentSem;
          })
        : subjects;

      const list = (filtered.length > 0 ? filtered : subjects).map((s) => ({
        subjectId: String(s.id),
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName || "",
        semester: s.semester ?? inferSemesterFromCode(s.subjectCode) ?? null,
      }));

      list.sort((a, b) => (a.subjectCode || a.subjectName).localeCompare(b.subjectCode || b.subjectName));
      resolve(list);
    });
  });
};

export const subscribeToDeadlines = (onChange) => {
  const listener = (changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes[DEADLINES_KEY] ||
      changes[DEADLINE_SETTINGS_KEY] ||
      changes[DEADLINE_SYNC_STATUS_KEY] ||
      changes.pesuData
    ) {
      onChange();
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};
