import { test, describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("deadlineCheck - Background Store & Alarm Logic", () => {
  const store = {};
  const alarmsCreated = [];
  const downloads = [];

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    alarmsCreated.length = 0;
    downloads.length = 0;

    global.chrome = {
      runtime: {
        lastError: null,
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
      alarms: {
        create: (name, info) => {
          alarmsCreated.push({ name, info });
        },
        clear: (name, cb) => (cb ? cb(true) : null),
        clearAll: (cb) => (cb ? cb(true) : null),
        getAll: (cb) => cb([]),
      },
      action: {
        setBadgeText: () => {},
        setBadgeBackgroundColor: () => {},
      },
      notifications: {
        create: (id, opts, cb) => (cb ? cb("notif-1") : null),
      },
      downloads: {
        download: (options, cb) => {
          downloads.push(options);
          cb(101);
        },
      },
    };
  });

  it("creates custom deadline with documents in store", async () => {
    const { saveCustomDeadline, getAllDeadlinesPayload } = await import(
      "../src/initalizers/deadlineCheck.js"
    );

    const created = await saveCustomDeadline({
      title: "Data Structures Assignment",
      dueAt: Date.now() + 86400000,
      files: [{ name: "bst.py", size: 2048 }],
    });

    assert.equal(created.length, 1);
    assert.equal(created[0].title, "Data Structures Assignment");
    assert.equal(created[0].files.length, 1);
    assert.equal(created[0].files[0].name, "bst.py");

    const payload = await getAllDeadlinesPayload();
    assert.equal(payload.items.length, 1);
  });

  it("streams targetUrl directly to chrome.downloads.download", async () => {
    const { downloadAssignmentFile } = await import(
      "../src/initalizers/deadlineCheck.js"
    );

    const result = await downloadAssignmentFile({
      url: "/Academy/s/referenceMeterials/downloadcoursedoc/54321",
      filename: "Unit_3_Problems.pdf",
    });

    assert.equal(result.downloadId, 101);
    assert.equal(downloads.length, 1);
    assert.equal(
      downloads[0].url,
      "https://www.pesuacademy.com/Academy/s/referenceMeterials/downloadcoursedoc/54321"
    );
    assert.equal(downloads[0].filename, "Unit_3_Problems.pdf");
  });

  it("updates deadline settings and persists", async () => {
    const { updateDeadlineSettings, getDeadlineSettings } = await import(
      "../src/initalizers/deadlineCheck.js"
    );

    const saved = await updateDeadlineSettings({
      notificationsEnabled: true,
      leadHours: [48, 12, 1],
      overdueReminder: false,
    });

    assert.deepEqual(saved.leadHours, [48, 12, 1]);
    assert.equal(saved.overdueReminder, false);

    const loaded = await getDeadlineSettings();
    assert.deepEqual(loaded.leadHours, [48, 12, 1]);
    assert.equal(loaded.overdueReminder, false);
  });

  it("updates auto-created PESU assignment in background store and schedules alarms", async () => {
    const { updateDeadlineItem, getAllDeadlinesPayload } = await import(
      "../src/initalizers/deadlineCheck.js"
    );

    const pesuId = "pesu:sub1:unit2:cls3";
    const dueTime = Date.now() + 3600000 * 20;

    const items = await updateDeadlineItem(pesuId, {
      title: "Unit 2 Relational Algebra Assignment",
      dueAt: dueTime,
      hasTime: true,
      notes: "Auto-created portal item updated with deadline",
      files: [{ name: "schema.sql" }],
    });

    const item = items.find((i) => i.id === pesuId);
    assert.ok(item);
    assert.equal(item.title, "Unit 2 Relational Algebra Assignment");
    assert.equal(item.dueAt, dueTime);
    assert.equal(item.source, "pesu");
    assert.equal(item.dueDateSource, "manual");
    assert.equal(item.files.length, 1);
    assert.equal(item.files[0].name, "schema.sql");

    // Check alarm scheduled
    const matchingAlarm = alarmsCreated.find((a) => a.name.includes(pesuId));
    assert.ok(matchingAlarm);
  });
});

