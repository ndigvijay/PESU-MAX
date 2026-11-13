import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractDeadlineFromHtml } from "../src/helpers/deadlineParser.js";

describe("deadlineParser - HTML Due Date Extraction", () => {
  const fixedNow = new Date("2026-11-13T12:00:00Z").getTime();

  it("extracts due date from table with Last Date for Submission", () => {
    const html = `
      <div class="assignment-container">
        <table>
          <tr>
            <td>Assignment Title</td>
            <td>Neural Networks Implementation</td>
          </tr>
          <tr>
            <td>Last Date for Submission</td>
            <td>28/11/2026 11:59 PM</td>
          </tr>
        </table>
        <a href="/Academy/s/referenceMeterials/downloadcoursedoc/98765">Question Paper.pdf</a>
      </div>
    `;

    const result = extractDeadlineFromHtml(html, { now: fixedNow });
    assert.ok(result);
    assert.ok(result.deadline);
    assert.ok(result.deadline.dueAt != null);
    const d = new Date(result.deadline.dueAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 10); // Nov
    assert.equal(d.getDate(), 28);
    assert.equal(d.getHours(), 23);
    assert.equal(d.getMinutes(), 59);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].name, "Question Paper.pdf");
  });

  it("extracts due date from bold prompt text", () => {
    const html = `
      <div class="content">
        <p><strong>Submission Deadline:</strong> 30th November 2026, 5:00 PM</p>
        <p>Please submit the zip file through the portal.</p>
      </div>
    `;

    const result = extractDeadlineFromHtml(html, { now: fixedNow });
    assert.ok(result);
    assert.ok(result.deadline);
    assert.ok(result.deadline.dueAt != null);
    const d = new Date(result.deadline.dueAt);
    assert.equal(d.getDate(), 30);
    assert.equal(d.getHours(), 17);
  });

  it("filters out upload/created timestamps in favor of due dates", () => {
    const html = `
      <div>
        <p>Uploaded on: 10 Nov 2026 at 10:00 AM</p>
        <p>Due Date: 26 Nov 2026 at 11:59 PM</p>
      </div>
    `;

    const result = extractDeadlineFromHtml(html, { now: fixedNow });
    assert.ok(result);
    assert.ok(result.deadline);
    const d = new Date(result.deadline.dueAt);
    assert.equal(d.getDate(), 26);
  });
});
