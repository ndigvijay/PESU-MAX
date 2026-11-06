import {
  CONTENT_TYPE_NAMES,
  getAllSemesters,
  getCourseMaterials,
  getCourseUnits,
  getSemesterDetails,
  getUnitClasses
} from "../helpers/pesuAPI.js";
import {
  parseCourseUnits,
  parseDownloadLinks,
  parseSemesterDetails,
  parseSemesters,
  parseUnitClasses
} from "../helpers/parser.js";
import { parallelBatch } from "../helpers/MiscControllers.js";
import {
  buildSubjectResources,
  dedupeResourceNotifications,
  findCurrentSemester,
  getNotificationSignature,
  mergeResourceNotifications
} from "../helpers/resourceChanges.js";
import { save, load } from "../utils/storage.js";
import {
  RESOURCES_KEY,
  RESOURCE_CHECKED_AT_KEY,
  RESOURCE_CHECK_RUNNING_KEY,
  RESOURCE_NOTIFICATIONS_KEY,
  RESOURCE_NOTIFICATIONS_READ_KEY
} from "../utils/storageKeys.js";

export const RESOURCE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let resourceCheckPromise = null;

export async function isResourceCheckDue() {
  const checkedAt = await load(RESOURCE_CHECKED_AT_KEY);
  return !checkedAt || Date.now() - checkedAt >= RESOURCE_CHECK_INTERVAL_MS;
}

async function fetchSubjectUnits(subjectId) {
  const unitsHtml = await getCourseUnits(subjectId);
  const units = unitsHtml ? parseCourseUnits(unitsHtml) : [];

  return parallelBatch(units, async (unit) => {
    try {
      const classesHtml = await getUnitClasses(subjectId, unit.id);
      return { ...unit, classes: classesHtml ? parseUnitClasses(classesHtml) : [] };
    } catch (err) {
      console.error(`Error fetching classes for unit ${unit.id}:`, err);
      return { ...unit, classes: [], failed: true };
    }
  }, 3);
}

async function fetchClassFiles(subjectId, unitId, classItem, type) {
  const result = await getCourseMaterials(subjectId, unitId, classItem.id, classItem.classNo, type);

  // PESU serves a lone file directly instead of listing it.
  if (result?.type !== "html") {
    return [{ id: `${classItem.id}:${type}`, name: CONTENT_TYPE_NAMES[type] }];
  }

  return parseDownloadLinks(result.data)
    .filter((link) => link.docId)
    .map((link) => ({ id: link.docId, name: link.name || CONTENT_TYPE_NAMES[type] }));
}

async function appendNotifications(notifications) {
  const existing = await load(RESOURCE_NOTIFICATIONS_KEY);
  await save(RESOURCE_NOTIFICATIONS_KEY, mergeResourceNotifications(existing || [], notifications));
}

export async function dedupeStoredResourceNotifications() {
  try {
    const [rawNotifications, rawReadIds] = await Promise.all([
      load(RESOURCE_NOTIFICATIONS_KEY),
      load(RESOURCE_NOTIFICATIONS_READ_KEY)
    ]);

    if (!Array.isArray(rawNotifications) || rawNotifications.length === 0) {
      return;
    }

    const deduped = dedupeResourceNotifications(rawNotifications);
    if (deduped.length === rawNotifications.length) {
      return;
    }

    const rawReadSet = new Set(Array.isArray(rawReadIds) ? rawReadIds : []);
    const readSignatures = new Set();

    for (const notification of rawNotifications) {
      if (notification?.id && rawReadSet.has(notification.id)) {
        const signature = getNotificationSignature(notification);
        if (signature) {
          readSignatures.add(signature);
        }
      }
    }

    const existingIds = new Set(deduped.map((notification) => notification.id));
    const nextReadIds = new Set(Array.from(rawReadSet).filter((id) => existingIds.has(id)));

    for (const notification of deduped) {
      const signature = getNotificationSignature(notification);
      if (signature && readSignatures.has(signature)) {
        nextReadIds.add(notification.id);
      }
    }

    await save(RESOURCE_NOTIFICATIONS_KEY, deduped);
    if (Array.isArray(rawReadIds)) {
      await save(RESOURCE_NOTIFICATIONS_READ_KEY, Array.from(nextReadIds));
    }
  } catch (err) {
    console.error("Error deduplicating stored resource notifications:", err);
  }
}

async function runResourceCheck() {
  const semester = findCurrentSemester(parseSemesters(await getAllSemesters()));
  if (!semester) {
    return;
  }

  const subjects = parseSemesterDetails(await getSemesterDetails(semester.value));
  const previous = await load(RESOURCES_KEY);
  const sameSemester = previous?.semesterId === semester.value;
  const state = {
    semesterId: semester.value,
    semester: semester.number,
    checkedAt: Date.now(),
    subjects: sameSemester ? { ...previous.subjects } : {}
  };

  for (const subject of subjects) {
    let units;
    try {
      units = await fetchSubjectUnits(subject.id);
    } catch (err) {
      console.error(`Error fetching units for subject ${subject.id}:`, err);
      continue;
    }

    const { resources, notifications } = await buildSubjectResources({
      subject,
      units,
      previousSubject: sameSemester ? previous.subjects?.[subject.id] : undefined,
      semester: semester.number,
      fetchFiles: fetchClassFiles
    });

    state.subjects[subject.id] = resources;
    await save(RESOURCES_KEY, state);

    if (notifications.length > 0) {
      await appendNotifications(notifications);
    }
  }
}

export function markResourceCheckStarted() {
  return save(RESOURCE_CHECKED_AT_KEY, Date.now());
}

export async function checkCurrentSemesterResources() {
  if (resourceCheckPromise) {
    return resourceCheckPromise;
  }

  resourceCheckPromise = (async () => {
    await save(RESOURCE_CHECK_RUNNING_KEY, true);
    try {
      await runResourceCheck();
    } finally {
      await save(RESOURCE_CHECK_RUNNING_KEY, false);
      resourceCheckPromise = null;
    }
  })();

  return resourceCheckPromise;
}
