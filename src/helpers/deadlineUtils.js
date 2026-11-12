export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

const ASSIGNMENT_TYPE_ID = 5;

export const DEFAULT_DEADLINE_SETTINGS = {
  notificationsEnabled: true,
  leadHours: [24, 6, 1],
  overdueReminder: true,
};

export function sanitizeDeadlineSettings(raw) {
  const leadHours = Array.isArray(raw?.leadHours)
    ? [
        ...new Set(
          raw.leadHours.map(Number).filter((h) => Number.isFinite(h) && h > 0 && h <= 168)
        ),
      ].sort((a, b) => b - a)
    : DEFAULT_DEADLINE_SETTINGS.leadHours;

  return {
    notificationsEnabled: raw?.notificationsEnabled !== false,
    leadHours: leadHours.length > 0 ? leadHours : [],
    overdueReminder: raw?.overdueReminder !== false,
  };
}

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export const DEADLINE_KEYWORD_REGEX =
  /\b(?:due\s*(?:date|on|by)?|deadline|last\s*date(?:\s*(?:of|for)\s*(?:submission|upload))?|submit\s*(?:by|before|on|till|until)?|submission\s*(?:date|deadline|ends?|closes?)|closing\s*date|end\s*date|cut[\s-]*off|valid\s*(?:till|until))\b/i;

export const UPLOAD_ONLY_KEYWORD_REGEX =
  /\b(?:posted\s*(?:on|at)|uploaded\s*(?:on|at)|created\s*(?:on|at)|modified\s*(?:on|at)|published\s*(?:on|at)|updated\s*(?:on|at)|start\s*date)\b/i;

const MONTH_NAME_PATTERN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const TIME_PATTERN =
  "(?:(?:at|@|\\s)\\s*(\\d{1,2})(?::(\\d{2}))?(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?";

const ISO_DATE_REGEX = new RegExp(
  `\\b(20\\d{2})[-/](\\d{1,2})[-/](\\d{1,2})(?:[T\\s]+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(am|pm)?)?\\b`,
  "i"
);

const DMY_NUMERIC_REGEX = new RegExp(
  `\\b(\\d{1,2})[-/.](\\d{1,2})[-/.]((?:20)?\\d{2})${TIME_PATTERN}\\b`,
  "i"
);

const DMY_NAMED_REGEX = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s,-]+(${MONTH_NAME_PATTERN})[\\s,.-]+(20\\d{2})(?:[,\\s]+(?:at\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?\\b`,
  "i"
);

const MDY_NAMED_REGEX = new RegExp(
  `\\b(${MONTH_NAME_PATTERN})[\\s.-]+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(20\\d{2})(?:[,\\s]+(?:at\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?\\b`,
  "i"
);

const YEARLESS_DMY_REGEX = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${MONTH_NAME_PATTERN})(?:[,\\s]+(?:at\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?\\b`,
  "i"
);

const YEARLESS_MDY_REGEX = new RegExp(
  `\\b(${MONTH_NAME_PATTERN})[\\s.-]+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(?:at\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?\\b`,
  "i"
);

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

function normalizeYear(rawYear) {
  const yearNum = Number(rawYear);
  if (!Number.isInteger(yearNum)) return null;
  const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
  if (fullYear < 2020 || fullYear > 2035) return null;
  return fullYear;
}

function buildValidatedTimestamp(year, monthIndex, day, rawHour, rawMinute, rawSecond, meridiem) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    return null;
  }
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
    return null;
  }

  let hasTime = false;
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (rawHour !== undefined && rawHour !== null && rawHour !== "") {
    let parsedHour = Number(rawHour);
    const parsedMinute = rawMinute !== undefined && rawMinute !== "" ? Number(rawMinute) : 0;
    const parsedSecond = rawSecond !== undefined && rawSecond !== "" ? Number(rawSecond) : 0;
    const mer = meridiem ? meridiem.toLowerCase() : "";

    if (mer === "pm" && parsedHour < 12) parsedHour += 12;
    else if (mer === "am" && parsedHour === 12) parsedHour = 0;

    if (parsedHour >= 0 && parsedHour <= 23 && parsedMinute >= 0 && parsedMinute <= 59) {
      hours = parsedHour;
      minutes = parsedMinute;
      seconds = parsedSecond >= 0 && parsedSecond <= 59 ? parsedSecond : 0;
      hasTime = true;
    }
  }

  const candidate = new Date(year, monthIndex, day, hours, minutes, seconds, 0);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== monthIndex ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { dueAt: candidate.getTime(), hasTime };
}

function resolveYearForMonthDay(monthIndex, day, now = Date.now()) {
  const ref = new Date(now);
  const currentYear = ref.getFullYear();
  const candidates = [currentYear - 1, currentYear, currentYear + 1].map((yr) => {
    const dt = new Date(yr, monthIndex, day, 23, 59, 59, 0);
    return { yr, diff: dt.getTime() - now };
  });

  const plausible = candidates.find(
    (c) => c.diff >= -45 * DAY_MS && c.diff <= 300 * DAY_MS
  );
  return plausible ? plausible.yr : currentYear;
}

function parseTimeTail(tailText) {
  if (!tailText) return null;
  const match = tailText.match(
    /^\s*(?:,|at|@)?\s*(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm|hrs?)?\b/i
  );
  if (!match) return null;
  if (match[2] === undefined && !match[4]) return null;
  return {
    hour: match[1],
    minute: match[2],
    second: match[3],
    meridiem: match[4],
    tailMatch: match[0],
  };
}

export function parseDateAndTime(text, options = {}) {
  if (!text || typeof text !== "string") return null;
  const now = options.now ?? Date.now();
  const allowYearless = options.allowYearless ?? false;

  const cleaned = text.replace(/\b20\d{2}\s*[-/]\s*\d{2}(?!\s*[-/]\s*\d)\b/g, " ");

  const isoMatch = cleaned.match(ISO_DATE_REGEX);
  if (isoMatch) {
    const year = normalizeYear(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const tail = isoMatch[4]
      ? null
      : parseTimeTail(
          cleaned.slice(isoMatch.index + isoMatch[0].length, isoMatch.index + isoMatch[0].length + 20)
        );
    const built = buildValidatedTimestamp(
      year,
      monthIndex,
      day,
      isoMatch[4] ?? tail?.hour,
      isoMatch[5] ?? tail?.minute,
      isoMatch[6] ?? tail?.second,
      isoMatch[7] ?? tail?.meridiem
    );
    if (built) {
      return {
        ...built,
        matchedText: (isoMatch[0] + (tail?.tailMatch || "")).trim(),
      };
    }
  }

  const dmyNamed = cleaned.match(DMY_NAMED_REGEX);
  if (dmyNamed) {
    const day = Number(dmyNamed[1]);
    const monthIndex = MONTHS[dmyNamed[2].toLowerCase()];
    const year = normalizeYear(dmyNamed[3]);
    const hasInlineTime = dmyNamed[4] !== undefined && (dmyNamed[5] !== undefined || dmyNamed[6]);
    const tail = !hasInlineTime
      ? parseTimeTail(
          cleaned.slice(dmyNamed.index + dmyNamed[0].length, dmyNamed.index + dmyNamed[0].length + 20)
        )
      : null;
    const built = buildValidatedTimestamp(
      year,
      monthIndex,
      day,
      hasInlineTime ? dmyNamed[4] : tail?.hour,
      hasInlineTime ? dmyNamed[5] : tail?.minute,
      tail?.second,
      hasInlineTime ? dmyNamed[6] : tail?.meridiem
    );
    if (built) {
      return {
        ...built,
        matchedText: (dmyNamed[0] + (tail?.tailMatch || "")).trim(),
      };
    }
  }

  const mdyNamed = cleaned.match(MDY_NAMED_REGEX);
  if (mdyNamed) {
    const monthIndex = MONTHS[mdyNamed[1].toLowerCase()];
    const day = Number(mdyNamed[2]);
    const year = normalizeYear(mdyNamed[3]);
    const hasInlineTime = mdyNamed[4] !== undefined && (mdyNamed[5] !== undefined || mdyNamed[6]);
    const tail = !hasInlineTime
      ? parseTimeTail(
          cleaned.slice(mdyNamed.index + mdyNamed[0].length, mdyNamed.index + mdyNamed[0].length + 20)
        )
      : null;
    const built = buildValidatedTimestamp(
      year,
      monthIndex,
      day,
      hasInlineTime ? mdyNamed[4] : tail?.hour,
      hasInlineTime ? mdyNamed[5] : tail?.minute,
      tail?.second,
      hasInlineTime ? mdyNamed[6] : tail?.meridiem
    );
    if (built) {
      return {
        ...built,
        matchedText: (mdyNamed[0] + (tail?.tailMatch || "")).trim(),
      };
    }
  }

  const dmyNumeric = cleaned.match(DMY_NUMERIC_REGEX);
  if (dmyNumeric) {
    let first = Number(dmyNumeric[1]);
    let second = Number(dmyNumeric[2]);
    const year = normalizeYear(dmyNumeric[3]);
    if (second > 12 && first <= 12) {
      [first, second] = [second, first];
    }
    const hasInlineTime = dmyNumeric[4] !== undefined && (dmyNumeric[5] !== undefined || dmyNumeric[7]);
    const tail = !hasInlineTime
      ? parseTimeTail(
          cleaned.slice(dmyNumeric.index + dmyNumeric[0].length, dmyNumeric.index + dmyNumeric[0].length + 20)
        )
      : null;
    const built = buildValidatedTimestamp(
      year,
      second - 1,
      first,
      hasInlineTime ? dmyNumeric[4] : tail?.hour,
      hasInlineTime ? dmyNumeric[5] : tail?.minute,
      hasInlineTime ? dmyNumeric[6] : tail?.second,
      hasInlineTime ? dmyNumeric[7] : tail?.meridiem
    );
    if (built) {
      return {
        ...built,
        matchedText: (dmyNumeric[0] + (tail?.tailMatch || "")).trim(),
      };
    }
  }

  if (allowYearless) {
    const yearlessDmy = cleaned.match(YEARLESS_DMY_REGEX);
    if (yearlessDmy) {
      const day = Number(yearlessDmy[1]);
      const monthIndex = MONTHS[yearlessDmy[2].toLowerCase()];
      const year = resolveYearForMonthDay(monthIndex, day, now);
      const hasInlineTime = yearlessDmy[3] !== undefined && (yearlessDmy[4] !== undefined || yearlessDmy[5]);
      const built = buildValidatedTimestamp(
        year,
        monthIndex,
        day,
        hasInlineTime ? yearlessDmy[3] : undefined,
        hasInlineTime ? yearlessDmy[4] : undefined,
        undefined,
        hasInlineTime ? yearlessDmy[5] : undefined
      );
      if (built) {
        return { ...built, matchedText: yearlessDmy[0].trim() };
      }
    }

    const yearlessMdy = cleaned.match(YEARLESS_MDY_REGEX);
    if (yearlessMdy) {
      const monthIndex = MONTHS[yearlessMdy[1].toLowerCase()];
      const day = Number(yearlessMdy[2]);
      const year = resolveYearForMonthDay(monthIndex, day, now);
      const hasInlineTime = yearlessMdy[3] !== undefined && (yearlessMdy[4] !== undefined || yearlessMdy[5]);
      const built = buildValidatedTimestamp(
        year,
        monthIndex,
        day,
        hasInlineTime ? yearlessMdy[3] : undefined,
        hasInlineTime ? yearlessMdy[4] : undefined,
        undefined,
        hasInlineTime ? yearlessMdy[5] : undefined
      );
      if (built) {
        return { ...built, matchedText: yearlessMdy[0].trim() };
      }
    }
  }

  return null;
}

export function extractDeadlineFromText(text, options = {}) {
  if (!text || typeof text !== "string") return null;
  const now = options.now ?? Date.now();
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const segments = text
    .split(/[\r\n|;]+/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const segment of segments) {
    const keywordMatch = segment.match(DEADLINE_KEYWORD_REGEX);
    if (!keywordMatch) continue;

    const afterKeyword = segment.slice(
      keywordMatch.index + keywordMatch[0].length,
      keywordMatch.index + keywordMatch[0].length + 90
    );
    const parsedAfter = parseDateAndTime(afterKeyword, { now, allowYearless: true });
    if (parsedAfter) {
      return {
        ...parsedAfter,
        rawDateText: segment.slice(keywordMatch.index, Math.min(segment.length, keywordMatch.index + 80)).trim(),
        confidence: "keyword",
      };
    }

    if (!UPLOAD_ONLY_KEYWORD_REGEX.test(segment)) {
      const parsedSegment = parseDateAndTime(segment, { now, allowYearless: true });
      if (parsedSegment) {
        return {
          ...parsedSegment,
          rawDateText: segment.slice(0, 80).trim(),
          confidence: "keyword",
        };
      }
    }
  }

  if (options.allowUnanchoredDate) {
    if (UPLOAD_ONLY_KEYWORD_REGEX.test(normalized) && !DEADLINE_KEYWORD_REGEX.test(normalized)) {
      return null;
    }
    const parsed = parseDateAndTime(normalized, { now, allowYearless: Boolean(options.allowYearless) });
    if (parsed) {
      return {
        ...parsed,
        rawDateText: parsed.matchedText,
        confidence: "unanchored",
      };
    }
  }

  return null;
}

export function buildPesuAssignmentId(subjectId, unitId, classId) {
  return `pesu:${subjectId}:${unitId}:${classId}`;
}

export function extractCachedAssignmentsFromPesuData(
  pesuData,
  resourcesData = null,
  options = {}
) {
  if (!pesuData?.subjects) return [];
  const now = options.now ?? Date.now();
  const currentSemester = options.currentSemester ?? null;
  const onlyCurrentSemester = Boolean(options.onlyCurrentSemester && currentSemester != null);
  const extracted = [];

  for (const subject of Object.values(pesuData.subjects)) {
    if (!subject?.id) continue;
    const semester = subject.semester ?? inferSemesterFromCode(subject.subjectCode);
    if (onlyCurrentSemester && semester != null && semester !== currentSemester) {
      continue;
    }

    const resUnits = resourcesData?.subjects?.[subject.id]?.units || {};
    for (const unit of Object.values(subject.units || {})) {
      if (!unit?.id) continue;
      const resClasses = resUnits?.[unit.id]?.classes || {};
      const classList = Array.isArray(unit.classes)
        ? unit.classes
        : Object.values(unit.classes || {});

      for (const cls of classList) {
        if (!cls?.id) continue;
        const countFromPesu = Number(cls.resourceCounts?.[ASSIGNMENT_TYPE_ID] || 0);
        const hasTypeInPesu =
          Array.isArray(cls.contentTypes) && cls.contentTypes.includes(ASSIGNMENT_TYPE_ID);
        const resClass = resClasses?.[cls.id];
        const countFromRes = Number(resClass?.counts?.[ASSIGNMENT_TYPE_ID] || 0);
        const cachedFiles = Array.isArray(resClass?.files?.[ASSIGNMENT_TYPE_ID])
          ? resClass.files[ASSIGNMENT_TYPE_ID]
          : [];

        const assignmentCount = Math.max(countFromPesu, countFromRes, cachedFiles.length);
        const hasAssignment = assignmentCount > 0 || hasTypeInPesu;
        if (!hasAssignment) continue;

        const files = cachedFiles.map((file) => ({
          docId: file.id || null,
          name: file.name || "Assignment",
          url:
            file.id && !String(file.id).includes(":")
              ? `/Academy/s/referenceMeterials/downloadcoursedoc/${file.id}`
              : null,
        }));

        let parsedDate = null;
        const candidateStrings = [
          cls.assignmentDueHint,
          cls.className,
          ...files.map((f) => f.name),
        ].filter(Boolean);

        for (let i = 0; i < candidateStrings.length; i++) {
          const allowUnanchored = i > 0 || Boolean(cls.assignmentDueHint);
          const found = extractDeadlineFromText(candidateStrings[i], {
            now,
            allowUnanchoredDate: allowUnanchored,
            allowYearless: false,
          });
          if (found) {
            parsedDate = found;
            break;
          }
        }

        const primaryFileTitle =
          files.length === 1 && files[0]?.name && !/^assignments?$/i.test(files[0].name)
            ? files[0].name
            : null;

        const title = primaryFileTitle || cls.className || "Assignment";

        extracted.push({
          id: buildPesuAssignmentId(subject.id, unit.id, cls.id),
          source: "pesu",
          subjectId: String(subject.id),
          subjectCode: subject.subjectCode || "",
          subjectName: subject.subjectName || "",
          semester: semester ?? null,
          isCurrentSemester:
            currentSemester == null || semester == null || semester === currentSemester,
          unitId: String(unit.id),
          unitName: unit.name || "",
          classId: String(cls.id),
          classNo: cls.classNo != null ? String(cls.classNo) : "",
          className: cls.className || "",
          assignmentCount: assignmentCount || 1,
          title,
          dueAt: parsedDate?.dueAt ?? null,
          dueDateSource: parsedDate ? "parsed" : "none",
          hasTime: parsedDate?.hasTime ?? false,
          rawDateText: parsedDate?.rawDateText ?? null,
          files,
        });
      }
    }
  }

  return extracted;
}

export function mergeSinglePesuItem(existing, incoming, now = Date.now()) {
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

export function mergePesuDataIntoStore(
  store,
  pesuData,
  resourcesData,
  userProfile,
  semestersData
) {
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

  return changed;
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
