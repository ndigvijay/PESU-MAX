import { load as loadHtml } from "cheerio";
import { CONTENT_TYPE_IDS } from "./pesuAPI.js";
import { parseDownloadLinks } from "./parser.js";
import {
  DAY_MS,
  HOUR_MS,
  inferSemesterFromCode,
  resolveCurrentSemesterNumber,
  getDeadlineStatus,
  sortDeadlines,
  isActiveForBadge,
  computeBadgeSummary,
} from "./deadlineUtils.js";

export {
  DAY_MS,
  HOUR_MS,
  inferSemesterFromCode,
  resolveCurrentSemesterNumber,
  getDeadlineStatus,
  sortDeadlines,
  isActiveForBadge,
  computeBadgeSummary,
};

const ASSIGNMENT_TYPE_ID = CONTENT_TYPE_IDS.assignments;

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

const DEADLINE_KEYWORD_REGEX =
  /\b(?:due\s*(?:date|on|by)?|deadline|last\s*date(?:\s*(?:of|for)\s*(?:submission|upload))?|submit\s*(?:by|before|on|till|until)?|submission\s*(?:date|deadline|ends?|closes?)|closing\s*date|end\s*date|cut[\s-]*off|valid\s*(?:till|until))\b/i;

const UPLOAD_ONLY_KEYWORD_REGEX =
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
  `\\b(${MONTH_NAME_PATTERN})[\\s.-]+(\\d{1,2})(?:st|nd|rd|th)?(?:,|\\s)+\\s*(20\\d{2})(?:[,\\s]+(?:at\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|hrs?)?)?\\b`,
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

  // Prefer dates from 45 days in the past up to 300 days in the future.
  const plausible = candidates.find(
    (c) => c.diff >= -45 * 86400_000 && c.diff <= 300 * 86400_000
  );
  return plausible ? plausible.yr : currentYear;
}

function parseTimeTail(tailText) {
  if (!tailText) return null;
  const match = tailText.match(
    /^\s*(?:,|at|@)?\s*(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm|hrs?)?\b/i
  );
  if (!match) return null;
  // Require either minutes (`:MM`) or explicit am/pm/hrs so trailing numbers like `1` don't match as time.
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

  // Strip academic year ranges like 2025-26 or course codes so they aren't confused for dates.
  const cleaned = text.replace(/\b20\d{2}\s*[-/]\s*\d{2}(?!\s*[-/]\s*\d)\b/g, " ");

  const isoMatch = cleaned.match(ISO_DATE_REGEX);
  if (isoMatch) {
    const year = normalizeYear(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const tail = isoMatch[4] ? null : parseTimeTail(cleaned.slice(isoMatch.index + isoMatch[0].length, isoMatch.index + isoMatch[0].length + 20));
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
      ? parseTimeTail(cleaned.slice(dmyNamed.index + dmyNamed[0].length, dmyNamed.index + dmyNamed[0].length + 20))
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
      ? parseTimeTail(cleaned.slice(mdyNamed.index + mdyNamed[0].length, mdyNamed.index + mdyNamed[0].length + 20))
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
    // Standard DMY; flip to MDY only if second exceeds 12 while first <= 12.
    if (second > 12 && first <= 12) {
      [first, second] = [second, first];
    }
    const hasInlineTime = dmyNumeric[4] !== undefined && (dmyNumeric[5] !== undefined || dmyNumeric[7]);
    const tail = !hasInlineTime
      ? parseTimeTail(cleaned.slice(dmyNumeric.index + dmyNumeric[0].length, dmyNumeric.index + dmyNumeric[0].length + 20))
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

  // Scan segments/lines for keyword-anchored deadline phrases first.
  const segments = text
    .split(/[\r\n|;]+/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const segment of segments) {
    const keywordMatch = segment.match(DEADLINE_KEYWORD_REGEX);
    if (!keywordMatch) continue;

    const afterKeyword = segment.slice(keywordMatch.index + keywordMatch[0].length, keywordMatch.index + keywordMatch[0].length + 90);
    const parsedAfter = parseDateAndTime(afterKeyword, { now, allowYearless: true });
    if (parsedAfter) {
      return {
        ...parsedAfter,
        rawDateText: segment.slice(keywordMatch.index, Math.min(segment.length, keywordMatch.index + 80)).trim(),
        confidence: "keyword",
      };
    }

    // Check full segment if date precedes keyword (e.g. "18 Nov 2026 deadline").
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

export function extractDeadlineFromHtml(html, options = {}) {
  if (!html || typeof html !== "string" || !html.trim()) {
    return { deadline: null, files: [], titleHint: null };
  }

  const now = options.now ?? Date.now();
  const $ = loadHtml(html);

  const rawLinks = parseDownloadLinks(html);
  const files = rawLinks.map((link) => ({
    docId: link.docId || null,
    name: link.name || null,
    url: link.url,
  }));

  let deadline = null;

  // 1. Inspect explicit data-* attributes or title tooltips containing deadline text.
  $("[data-due-date], [data-duedate], [data-deadline], [title]").each((_, el) => {
    if (deadline) return false;
    const candidates = [
      $(el).attr("data-due-date"),
      $(el).attr("data-duedate"),
      $(el).attr("data-deadline"),
      $(el).attr("title"),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const allowAny = !$(el).is("[title]") || DEADLINE_KEYWORD_REGEX.test(candidate);
      const found = extractDeadlineFromText(candidate, {
        now,
        allowUnanchoredDate: allowAny,
        allowYearless: true,
      });
      if (found) {
        deadline = found;
        return false;
      }
    }
  });

  // 2. Inspect structured table rows and label/value pairs.
  if (!deadline) {
    $("tr").each((_, row) => {
      if (deadline) return false;
      const cells = $(row).find("th, td");
      if (cells.length >= 2) {
        for (let i = 0; i < cells.length - 1; i++) {
          const labelText = $(cells[i]).text().replace(/\s+/g, " ").trim();
          if (DEADLINE_KEYWORD_REGEX.test(labelText)) {
            const valueText = $(cells[i + 1]).text().replace(/\s+/g, " ").trim();
            const parsed = parseDateAndTime(valueText, { now, allowYearless: true });
            if (parsed) {
              deadline = {
                ...parsed,
                rawDateText: `${labelText} ${valueText}`.trim().slice(0, 80),
                confidence: "table",
              };
              return false;
            }
          }
        }
      }

      const rowText = $(row).text().replace(/\s+/g, " ").trim();
      if (DEADLINE_KEYWORD_REGEX.test(rowText)) {
        const found = extractDeadlineFromText(rowText, { now });
        if (found) {
          deadline = found;
          return false;
        }
      }
    });
  }

  // 3. Inspect form groups, definition lists, and labeled blocks.
  if (!deadline) {
    $(".form-group, dl, .row, p, div, span, li").each((_, el) => {
      if (deadline) return false;
      // Only check small leaf/near-leaf containers to avoid matching entire page wrappers.
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (!text || text.length > 220) return;
      if (DEADLINE_KEYWORD_REGEX.test(text)) {
        const found = extractDeadlineFromText(text, { now });
        if (found) {
          deadline = found;
          return false;
        }
      }
    });
  }

  // 4. Plain-text fallback across stripped HTML lines.
  if (!deadline) {
    $("script, style").remove();
    const textContent = $.root()
      .find("br, p, div, tr, li, h1, h2, h3, h4, h5, h6")
      .after("\n")
      .end()
      .text();
    deadline = extractDeadlineFromText(textContent, { now });
  }

  // 5. Fallback: check file link names for embedded due dates.
  if (!deadline) {
    for (const file of files) {
      if (!file.name) continue;
      const found = extractDeadlineFromText(file.name, {
        now,
        allowUnanchoredDate: true,
        allowYearless: false,
      });
      if (found) {
        deadline = found;
        break;
      }
    }
  }

  let titleHint = null;
  const heading = $("h1, h2, h3, h4, .panel-title, .card-title").first().text().replace(/\s+/g, " ").trim();
  if (heading && heading.length > 2 && heading.length < 140 && !/^assignments?$/i.test(heading)) {
    titleHint = heading;
  }

  return { deadline, files, titleHint };
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

      for (const cls of unit.classes || []) {
        if (!cls?.id) continue;
        const countFromPesu = Number(cls.resourceCounts?.[ASSIGNMENT_TYPE_ID] || 0);
        const hasTypeInPesu = Array.isArray(cls.contentTypes) && cls.contentTypes.includes(ASSIGNMENT_TYPE_ID);
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
          url: file.id && !String(file.id).includes(":")
            ? `/Academy/s/referenceMeterials/downloadcoursedoc/${file.id}`
            : null,
        }));

        // Check for date hints in class name, cached assignment hint, or cached file names.
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
          isCurrentSemester: currentSemester == null || semester == null || semester === currentSemester,
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
