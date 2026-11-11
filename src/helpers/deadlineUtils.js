export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

export function inferSemesterFromCode(code) {
  if (!code || typeof code !== "string") return null;
  const numMatch = code.match(/(\d{3})/);
  if (!numMatch) return null;
  const number = numMatch[1];
  const group = parseInt(number[0], 10);
  const after = code.split(number)[1];
  if (!after) return null;
  const sectionMatch = after.match(/[A-Z]/);
  if (!sectionMatch) return null;
  const baseSemester = (group - 1) * 2 + 1;
  return sectionMatch[0] === "A" ? baseSemester : baseSemester + 1;
}

export function resolveCurrentSemesterNumber(userProfile, semestersData = []) {
  const fromProfile = parseInt(userProfile?.semester, 10);
  if (Number.isInteger(fromProfile) && fromProfile > 0) {
    return fromProfile;
  }

  if (Array.isArray(semestersData) && semestersData.length > 0) {
    const latest = semestersData.reduce(
      (best, sem) => (!best || (sem.number ?? 0) > (best.number ?? 0) ? sem : best),
      null
    );
    return latest?.number ?? null;
  }

  return null;
}

export function getDeadlineStatus(deadline, now = Date.now()) {
  if (!deadline) return "no-date";
  if (deadline.completed) return "completed";
  if (deadline.dueAt == null) return "no-date";
  const diff = deadline.dueAt - now;
  if (diff < 0) return "overdue";
  if (diff <= 24 * HOUR_MS) return "urgent";
  if (diff <= 3 * DAY_MS) return "soon";
  return "upcoming";
}

export function sortDeadlines(items = []) {
  const statusOrder = {
    overdue: 0,
    urgent: 1,
    soon: 2,
    upcoming: 3,
    "no-date": 4,
    completed: 5,
  };

  return [...items].sort((a, b) => {
    const statusA = getDeadlineStatus(a);
    const statusB = getDeadlineStatus(b);
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }

    if (a.dueAt != null && b.dueAt != null && a.dueAt !== b.dueAt) {
      return statusA === "completed" ? b.dueAt - a.dueAt : a.dueAt - b.dueAt;
    }

    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });
}

export function isActiveForBadge(deadline) {
  if (!deadline || deadline.completed) return false;
  if (deadline.source === "custom") return true;
  return deadline.isCurrentSemester !== false;
}

export function computeBadgeSummary(items = [], now = Date.now()) {
  let overdueCount = 0;
  let due24hCount = 0;
  let due48hCount = 0;
  let dueSoonCount = 0;
  let needsDateCount = 0;
  let completedCount = 0;
  let activeTotal = 0;

  for (const item of items) {
    if (item.completed) {
      completedCount++;
      continue;
    }
    if (!isActiveForBadge(item)) {
      continue;
    }
    activeTotal++;
    if (item.dueAt == null) {
      needsDateCount++;
      continue;
    }
    const diff = item.dueAt - now;
    if (diff < 0) {
      overdueCount++;
    } else {
      if (diff <= 24 * HOUR_MS) due24hCount++;
      if (diff <= 48 * HOUR_MS) due48hCount++;
      if (diff <= 72 * HOUR_MS) dueSoonCount++;
    }
  }

  return {
    activeTotal,
    overdueCount,
    due24hCount,
    due48hCount,
    dueSoonCount,
    needsDateCount,
    completedCount,
    badgeCount: overdueCount + due48hCount,
  };
}

