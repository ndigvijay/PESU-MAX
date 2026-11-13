import { test, describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("deadlineService - Local Storage Fallbacks & Document Handling", () => {
  const store = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];

    global.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (payload, cb) => {
          // Simulate closed message port (disconnected background worker)
          global.chrome.runtime.lastError = { message: "The message port closed before a response was received." };
          cb(undefined);
          global.chrome.runtime.lastError = null;
        },
      },
      storage: {
        local: {
          get: (keys, cb) => {
            const res = {};
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const k of keyList) {
              if (k in store) res[k] = JSON.parse(JSON.stringify(store[k]));
            }
            cb(res);
          },
          set: (items, cb) => {
            Object.assign(store, JSON.parse(JSON.stringify(items)));
            if (cb) cb();
          },
        },
      },
    };
  });

  it("falls back to local storage on port disconnected error for getDeadlines", async () => {
    const { getDeadlines } = await import("../src/services/deadlineService.js");
    const result = await getDeadlines();

    assert.ok(result);
    assert.deepEqual(result.items, []);
    assert.ok(result.workerWarning);
    assert.match(result.workerWarning, /Reload PESU-MAX/);
  });

  it("saves custom deadline with attached documents via local fallback", async () => {
    const { saveCustomDeadline, getDeadlines } = await import("../src/services/deadlineService.js");

    const sampleFile = {
      id: "file:1:doc",
      name: "lab_manual.pdf",
      size: 15420,
      type: "application/pdf",
      dataUrl: "data:application/pdf;base64,JVBERi0x...",
    };

    const res = await saveCustomDeadline({
      title: "Operating Systems Lab Report",
      subjectCode: "UE24CS303A",
      subjectName: "Operating Systems",
      dueAt: Date.now() + 86400000,
      notes: "Include CPU scheduling algorithms report",
      files: [sampleFile],
    });

    assert.ok(res);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].title, "Operating Systems Lab Report");
    assert.equal(res.items[0].source, "custom");
    assert.equal(res.items[0].files.length, 1);
    assert.equal(res.items[0].files[0].name, "lab_manual.pdf");
    assert.equal(res.items[0].files[0].dataUrl, sampleFile.dataUrl);

    // Verify persisted in local store
    const read = await getDeadlines();
    assert.equal(read.items.length, 1);
    assert.equal(read.items[0].files[0].name, "lab_manual.pdf");
  });

  it("updates custom deadline and preserves documents", async () => {
    const { saveCustomDeadline, updateDeadline } = await import("../src/services/deadlineService.js");

    const created = await saveCustomDeadline({
      title: "Mini Project Proposal",
      dueAt: Date.now() + 5000000,
      files: [{ id: "f1", name: "proposal.pdf" }],
    });

    const item = created.items[0];
    const updated = await updateDeadline(item.id, {
      title: "Mini Project Proposal (Final Draft)",
      files: [
        { id: "f1", name: "proposal.pdf" },
        { id: "f2", name: "architecture_diagram.png" },
      ],
    });

    const found = updated.items.find((i) => i.id === item.id);
    assert.equal(found.title, "Mini Project Proposal (Final Draft)");
    assert.equal(found.files.length, 2);
    assert.equal(found.files[1].name, "architecture_diagram.png");
  });

  it("deletes deadline via local fallback", async () => {
    const { saveCustomDeadline, deleteDeadline } = await import("../src/services/deadlineService.js");

    const created = await saveCustomDeadline({ title: "Temporary Assignment" });
    assert.equal(created.items.length, 1);

    const deleted = await deleteDeadline(created.items[0].id);
    assert.equal(deleted.items.length, 0);
  });

  it("updates auto-created PESU assignment deadline via local fallback", async () => {
    const { updateDeadline, getDeadlines } = await import("../src/services/deadlineService.js");

    const pesuId = "pesu:101:202:303";
    const dueTime = Date.now() + 172800000;

    const res = await updateDeadline(pesuId, {
      title: "DBMS Assignment 1 - ER Models",
      dueAt: dueTime,
      hasTime: true,
      notes: "Submit on portal before midnight",
      files: [{ id: "f1", name: "problem_sheet.pdf" }],
    });

    assert.ok(res);
    const updated = res.items.find((i) => i.id === pesuId);
    assert.ok(updated);
    assert.equal(updated.title, "DBMS Assignment 1 - ER Models");
    assert.equal(updated.dueAt, dueTime);
    assert.equal(updated.notes, "Submit on portal before midnight");
    assert.equal(updated.files.length, 1);
    assert.equal(updated.files[0].name, "problem_sheet.pdf");
  });
});

