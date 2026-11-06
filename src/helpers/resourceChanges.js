import { CONTENT_TYPE_NAMES } from "./pesuAPI.js";
import { parallelBatch } from "./MiscControllers.js";

export const MAX_RESOURCE_NOTIFICATIONS = 200;

export function findCurrentSemester(semesters = []) {
  return semesters.reduce(
    (latest, semester) => (!latest || semester.number > latest.number ? semester : latest),
    null
  );
}

// Without a recorded file list, only a class that did not exist before can be reported as new.
function getNewFiles(previousClass, type, files) {
  const previousFiles = previousClass?.files?.[type];
  if (Array.isArray(previousFiles)) {
    const knownIds = new Set(previousFiles.map((file) => file.id));
    return files.filter((file) => !knownIds.has(file.id));
  }
  return previousClass ? [] : files;
}

function collectFileTasks(unit, previousUnit) {
  const classes = {};
  const tasks = [];

  for (const classItem of unit.classes) {
    const previousClass = previousUnit?.classes?.[classItem.id];
    const entry = { name: classItem.className, classNo: classItem.classNo, counts: {}, files: {} };
    classes[classItem.id] = entry;

    for (const [typeKey, count] of Object.entries(classItem.resourceCounts || {})) {
      const type = Number(typeKey);
      const previousFiles = previousClass?.files?.[type];

      if (count === 0) {
        entry.counts[type] = 0;
        entry.files[type] = [];
      } else if (previousClass?.counts?.[type] === count && Array.isArray(previousFiles)) {
        entry.counts[type] = count;
        entry.files[type] = previousFiles;
      } else {
        tasks.push({ unit, classItem, previousClass, entry, type, count });
      }
    }
  }

  return { classes, tasks };
}

function groupNotifications(results, { subject, semester, detectedAt }) {
  const reportedFiles = new Set();
  const notifications = new Map();

  for (const { unit, classItem, type, newFiles } of results) {
    // Unit-wide notes, QB and QA are listed under every class of the unit; report them once.
    const files = newFiles.filter((file) => {
      const key = `${unit.id}:${file.id}`;
      if (reportedFiles.has(key)) return false;
      reportedFiles.add(key);
      return true;
    });

    if (files.length === 0) {
      continue;
    }

    const key = `${unit.id}:${classItem.id}`;
    if (!notifications.has(key)) {
      notifications.set(key, {
        id: `${subject.id}:${key}:${detectedAt}`,
        subjectId: String(subject.id),
        subjectCode: subject.subjectCode || "",
        subjectName: subject.subjectName || "",
        semester,
        unitId: String(unit.id),
        unitName: unit.name || "",
        classId: String(classItem.id),
        className: classItem.className || "",
        resources: [],
        detectedAt
      });
    }

    notifications.get(key).resources.push({
      type,
      label: CONTENT_TYPE_NAMES[type] || `Type ${type}`,
      added: files.length,
      items: files.map((file) => ({ docId: file.id, name: file.name }))
    });
  }

  return Array.from(notifications.values());
}

export async function buildSubjectResources({ subject, units, previousSubject, semester, fetchFiles, detectedAt = Date.now() }) {
  const resourceUnits = {};
  const tasks = [];

  for (const unit of units) {
    const previousUnit = previousSubject?.units?.[unit.id];
    if (unit.failed) {
      if (previousUnit) resourceUnits[unit.id] = previousUnit;
      continue;
    }

    const { classes, tasks: unitTasks } = collectFileTasks(unit, previousUnit);
    resourceUnits[unit.id] = { name: unit.name, classes };
    tasks.push(...unitTasks);
  }

  const results = await parallelBatch(tasks, async (task) => {
    const { previousClass, entry, type, count } = task;
    try {
      const files = await fetchFiles(subject.id, task.unit.id, task.classItem, type);
      entry.counts[type] = count;
      entry.files[type] = files;
      return { ...task, newFiles: previousSubject ? getNewFiles(previousClass, type, files) : [] };
    } catch (error) {
      console.error(`Error fetching ${CONTENT_TYPE_NAMES[type]} for class ${task.classItem.id}:`, error);
      if (Array.isArray(previousClass?.files?.[type])) {
        entry.counts[type] = previousClass.counts[type];
        entry.files[type] = previousClass.files[type];
      }
      return { ...task, newFiles: [] };
    }
  }, 3);

  return {
    resources: { code: subject.subjectCode, name: subject.subjectName, units: resourceUnits },
    notifications: groupNotifications(results, { subject, semester, detectedAt })
  };
}

export function getNotificationSignature(notification) {
  if (!notification) {
    return "";
  }

  const resourcesKey = (notification.resources || [])
    .map((resource) => {
      const itemsKey = (resource.items || [])
        .map((item) => `${item?.docId || ""}:${item?.name || ""}`)
        .sort()
        .join(",");
      return `${resource?.type ?? ""}:${resource?.added ?? ""}:${itemsKey}`;
    })
    .sort()
    .join("|");

  return [
    String(notification.subjectId || ""),
    String(notification.unitId || ""),
    String(notification.classId || ""),
    resourcesKey
  ].join("::");
}

export function dedupeResourceNotifications(notifications = []) {
  const seenSignatures = new Set();
  const seenIds = new Set();
  const deduped = [];

  for (const notification of notifications) {
    if (!notification?.id || seenIds.has(notification.id)) {
      continue;
    }

    const signature = getNotificationSignature(notification);
    if (signature && seenSignatures.has(signature)) {
      continue;
    }

    seenIds.add(notification.id);
    if (signature) {
      seenSignatures.add(signature);
    }
    deduped.push(notification);
  }

  return deduped;
}

export function mergeResourceNotifications(existing = [], incoming = []) {
  const existingSignatures = new Set(existing.map(getNotificationSignature).filter(Boolean));
  const freshIncoming = incoming.filter((notification) => {
    const signature = getNotificationSignature(notification);
    return !signature || !existingSignatures.has(signature);
  });

  return dedupeResourceNotifications(
    [...freshIncoming, ...existing].sort((a, b) => b.detectedAt - a.detectedAt)
  ).slice(0, MAX_RESOURCE_NOTIFICATIONS);
}
