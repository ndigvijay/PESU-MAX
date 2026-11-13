import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseDateAndTime,
  extractDeadlineFromText,
  inferSemesterFromCode,
  resolveCurrentSemesterNumber,
  sanitizeDeadlineSettings,
  getDeadlineStatus,
  computeBadgeSummary,
  buildPesuAssignmentId,
  extractCachedAssignmentsFromPesuData,
  mergePesuDataIntoStore,
  sortDeadlines,
  DEFAULT_DEADLINE_SETTINGS,
} from "../src/helpers/deadlineUtils.js";

describe("deadlineUtils - Date & Time Parsing", () => {
  const fixedNow = new Date("2026-11-13T12:00:00Z").getTime();

  it("parses named DMY dates with commas and whitespace", () => {
    const res = parseDateAndTime("Due date: 20th November 2026, 11:59 pm", { now: fixedNow });
    assert.ok(res);
    assert.equal(res.hasTime, true);
    assert.match(res.matchedText, /20th November 2026/);
    const d = new Date(res.dueAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 10); // Nov
    assert.equal(d.getDate(), 20);
    assert.equal(d.getHours(), 23);
    assert.equal(d.getMinutes(), 59);
  });

  it("parses named MDY dates correctly", () => {
    const res = parseDateAndTime("Submission deadline: November 25, 2026 at 5:00 PM", { now: fixedNow });
    assert.ok(res);
    assert.equal(res.hasTime, true);
    const d = new Date(res.dueAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 10);
    assert.equal(d.getDate(), 25);
    assert.equal(d.getHours(), 17);
  });

  it("parses numeric DMY dates correctly", () => {
    const res = parseDateAndTime("Last date: 15/12/2026 23:59", { now: fixedNow });
    assert.ok(res);
    const d = new Date(res.dueAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 11); // Dec
    assert.equal(d.getDate(), 15);
  });

  it("ignores upload-only metadata keywords", () => {
    const res = extractDeadlineFromText("Uploaded on 10 Nov 2026 at 10:00 AM", { now: fixedNow });
    assert.equal(res, null);
  });

  it("detects submission keywords", () => {
    const res = extractDeadlineFromText("Assignment 1 - Submit before 22 Nov 2026", { now: fixedNow });
    assert.ok(res);
    const d = new Date(res.dueAt);
    assert.equal(d.getDate(), 22);
    assert.equal(d.getMonth(), 10);
  });
});

describe("deadlineUtils - Semester Inference", () => {
  it("infers semester from subject code", () => {
    assert.equal(inferSemesterFromCode("UE24CS301A"), 5); // (3-1)*2+1 = 5
    assert.equal(inferSemesterFromCode("UE24CS301B"), 6); // base + 1 = 6
    assert.equal(inferSemesterFromCode("UE24CS201A"), 3); // (2-1)*2+1 = 3
    assert.equal(inferSemesterFromCode("INVALID"), null);
  });

  it("resolves current semester number", () => {
    assert.equal(resolveCurrentSemesterNumber({ semester: "5" }, []), 5);
    assert.equal(
      resolveCurrentSemesterNumber({}, [{ number: 3 }, { number: 6 }, { number: 4 }]),
      6
    );
  });
});

describe("deadlineUtils - Settings Sanitization", () => {
  it("sanitizes lead hours and booleans", () => {
    const clean = sanitizeDeadlineSettings({
      notificationsEnabled: true,
      leadHours: [48, 24, 24, -5, 500, "invalid", 6],
      overdueReminder: false,
    });
    assert.deepEqual(clean.leadHours, [48, 24, 6]);
    assert.equal(clean.notificationsEnabled, true);
    assert.equal(clean.overdueReminder, false);
  });

  it("falls back to default settings on invalid input", () => {
    const clean = sanitizeDeadlineSettings(null);
    assert.deepEqual(clean, DEFAULT_DEADLINE_SETTINGS);
  });
});

describe("deadlineUtils - Status & Summary Calculation", () => {
  const now = Date.now();

  it("computes correct deadline statuses", () => {
    assert.equal(getDeadlineStatus({ dueAt: null }), "no-date");
    assert.equal(getDeadlineStatus({ dueAt: now - 3600000 }), "overdue");
    assert.equal(getDeadlineStatus({ dueAt: now + 3600000 }), "urgent"); // within 24h
    assert.equal(getDeadlineStatus({ dueAt: now + 48 * 3600000 }), "soon"); // within 3 days
    assert.equal(getDeadlineStatus({ dueAt: now + 7 * 24 * 3600000 }), "upcoming");
  });

  it("computes badge summary correctly", () => {
    const items = [
      { id: "1", dueAt: now - 1000, completed: false, isCurrentSemester: true, source: "custom" },
      { id: "2", dueAt: now + 3600000, completed: false, isCurrentSemester: true, source: "custom" },
      { id: "3", dueAt: now + 10 * 86400000, completed: false, isCurrentSemester: true, source: "custom" },
      { id: "4", dueAt: now - 1000, completed: true, isCurrentSemester: true, source: "custom" }, // completed
    ];
    const summary = computeBadgeSummary(items);
    assert.equal(summary.overdueCount, 1);
    assert.equal(summary.due24hCount, 1);
    assert.equal(summary.badgeCount, 2);
  });
});

describe("deadlineUtils - PESU Data Extraction & Merging", () => {
  const mockPesuData = {
    subjects: {
      "101": {
        id: "101",
        subjectCode: "UE24CS301A",
        subjectName: "Software Engineering",
        semester: 5,
        units: {
          "201": {
            id: "201",
            name: "Unit 1",
            classes: [
              {
                id: "301",
                classNo: "1",
                className: "Assignment 1 (Due 25 Nov 2026)",
                contentTypes: [5],
                resourceCounts: { 5: 1 },
              },
            ],
          },
        },
      },
    },
  };

  it("extracts assignments from pesuData", () => {
    const items = extractCachedAssignmentsFromPesuData(mockPesuData, null, {
      currentSemester: 5,
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].source, "pesu");
    assert.equal(items[0].subjectCode, "UE24CS301A");
    assert.equal(items[0].dueDateSource, "parsed");
    assert.ok(items[0].dueAt != null);
  });

  it("merges pesuData into store and preserves existing custom properties", () => {
    const store = { items: {}, scannedClasses: {}, lastSyncedAt: null };
    const changed = mergePesuDataIntoStore(store, mockPesuData, null, { semester: "5" });
    assert.equal(changed, true);
    const key = buildPesuAssignmentId("101", "201", "301");
    assert.ok(store.items[key]);
    assert.equal(store.items[key].title, "Assignment 1 (Due 25 Nov 2026)");
  });
});
