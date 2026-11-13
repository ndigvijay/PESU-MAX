import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import deadlinesReducer, {
  setDeadlineSourceFilter,
  setDeadlineFilter,
  setDeadlineSearch,
  setShowAllSemesters,
  clearDeadlineError,
  selectSourceFilter,
  selectSourceCounts,
  selectScopedDeadlines,
  selectFilteredDeadlines,
  selectDeadlinesSummary,
} from "../frontend/redux/deadlinesSlice.js";

describe("deadlinesSlice - Redux Reducers & State Management", () => {
  it("initializes with default sourceFilter and filter", () => {
    const state = deadlinesReducer(undefined, { type: "@@INIT" });
    assert.equal(state.sourceFilter, "all");
    assert.equal(state.filter, "active");
    assert.equal(state.search, "");
    assert.equal(state.showAllSemesters, false);
    assert.deepEqual(state.items, []);
  });

  it("handles setDeadlineSourceFilter", () => {
    const s1 = deadlinesReducer(undefined, setDeadlineSourceFilter("custom"));
    assert.equal(s1.sourceFilter, "custom");

    const s2 = deadlinesReducer(s1, setDeadlineSourceFilter("pesu"));
    assert.equal(s2.sourceFilter, "pesu");

    const s3 = deadlinesReducer(s2, setDeadlineSourceFilter("all"));
    assert.equal(s3.sourceFilter, "all");
  });

  it("handles setDeadlineFilter and setDeadlineSearch", () => {
    let state = deadlinesReducer(undefined, setDeadlineFilter("overdue"));
    assert.equal(state.filter, "overdue");

    state = deadlinesReducer(state, setDeadlineSearch("Operating Systems"));
    assert.equal(state.search, "Operating Systems");
  });
});

describe("deadlinesSlice - Selectors & Option 1 Source Separation", () => {
  const now = Date.now();
  const mockState = {
    deadlines: {
      items: [
        {
          id: "custom-1",
          source: "custom",
          title: "DBMS Mini Project",
          subjectCode: "UE24CS302A",
          subjectName: "Database Systems",
          dueAt: now + 3600000, // urgent (<24h)
          completed: false,
          isCurrentSemester: true,
          files: [{ name: "schema.sql" }],
        },
        {
          id: "custom-2",
          source: "custom",
          title: "OS Lab Submission",
          subjectCode: "UE24CS303A",
          subjectName: "Operating Systems",
          dueAt: now - 3600000, // overdue
          completed: false,
          isCurrentSemester: true,
          files: [],
        },
        {
          id: "pesu-1",
          source: "pesu",
          title: "Unit 1 Practice Sheet",
          subjectCode: "UE24CS301A",
          subjectName: "Software Engineering",
          dueAt: null, // no-date
          completed: false,
          isCurrentSemester: true,
          files: [{ name: "Human_Activity_Classification.ipynb" }],
        },
        {
          id: "pesu-2",
          source: "pesu",
          title: "Assignment 2 Graded",
          subjectCode: "UE24CS301A",
          subjectName: "Software Engineering",
          dueAt: now + 48 * 3600000, // upcoming
          completed: false,
          isCurrentSemester: true,
          files: [],
        },
      ],
      filter: "active",
      sourceFilter: "all",
      search: "",
      showAllSemesters: false,
    },
  };

  it("calculates selectSourceCounts accurately", () => {
    const counts = selectSourceCounts(mockState);
    assert.equal(counts.all, 4);
    assert.equal(counts.custom, 2);
    assert.equal(counts.pesu, 2);
  });

  it("filters items by sourceFilter: 'all'", () => {
    const filtered = selectFilteredDeadlines(mockState);
    assert.equal(filtered.length, 4);
  });

  it("filters items by sourceFilter: 'custom' (My Deadlines)", () => {
    const state = {
      deadlines: {
        ...mockState.deadlines,
        sourceFilter: "custom",
      },
    };
    const filtered = selectFilteredDeadlines(state);
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((i) => i.source === "custom"));
  });

  it("filters items by sourceFilter: 'pesu' (PESU Academy)", () => {
    const state = {
      deadlines: {
        ...mockState.deadlines,
        sourceFilter: "pesu",
      },
    };
    const filtered = selectFilteredDeadlines(state);
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((i) => i.source === "pesu"));
  });

  it("filters by sub-tab filter: 'overdue'", () => {
    const state = {
      deadlines: {
        ...mockState.deadlines,
        filter: "overdue",
      },
    };
    const filtered = selectFilteredDeadlines(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "custom-2");
  });

  it("filters by sub-tab filter: 'needsDate'", () => {
    const state = {
      deadlines: {
        ...mockState.deadlines,
        filter: "needsDate",
      },
    };
    const filtered = selectFilteredDeadlines(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "pesu-1");
  });

  it("searches across titles, courses, and attached document names", () => {
    const state = {
      deadlines: {
        ...mockState.deadlines,
        search: "Classification.ipynb",
      },
    };
    const filtered = selectFilteredDeadlines(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "pesu-1");
  });
});

