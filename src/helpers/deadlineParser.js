import { load as loadHtml } from "cheerio";
import { parseDownloadLinks } from "./parser.js";
import {
  DAY_MS,
  DEADLINE_KEYWORD_REGEX,
  HOUR_MS,
  UPLOAD_ONLY_KEYWORD_REGEX,
  buildPesuAssignmentId,
  computeBadgeSummary,
  extractCachedAssignmentsFromPesuData,
  extractDeadlineFromText,
  getDeadlineStatus,
  inferSemesterFromCode,
  isActiveForBadge,
  mergePesuDataIntoStore,
  mergeSinglePesuItem,
  parseDateAndTime,
  resolveCurrentSemesterNumber,
  sortDeadlines,
} from "./deadlineUtils.js";

export {
  DAY_MS,
  HOUR_MS,
  buildPesuAssignmentId,
  computeBadgeSummary,
  extractCachedAssignmentsFromPesuData,
  extractDeadlineFromText,
  getDeadlineStatus,
  inferSemesterFromCode,
  isActiveForBadge,
  mergePesuDataIntoStore,
  mergeSinglePesuItem,
  parseDateAndTime,
  resolveCurrentSemesterNumber,
  sortDeadlines,
};

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
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (!text || text.length > 220) return;
      if (DEADLINE_KEYWORD_REGEX.test(text) && !UPLOAD_ONLY_KEYWORD_REGEX.test(text)) {
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
  const heading = $("h1, h2, h3, h4, .panel-title, .card-title")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (heading && heading.length > 2 && heading.length < 140 && !/^assignments?$/i.test(heading)) {
    titleHint = heading;
  }

  return { deadline, files, titleHint };
}
