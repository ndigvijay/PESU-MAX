import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DAY_MS,
  HOUR_MS,
  computeBadgeSummary,
  getDeadlineStatus,
  sortDeadlines,
} from "../helpers/deadlineUtils.js";
import { getDeadlines, subscribeToDeadlines, updateDeadline } from "../services/deadlineService.js";

function formatShortCountdown(item, now = Date.now()) {
  const status = getDeadlineStatus(item, now);
  if (status === "completed") return "Done";
  if (status === "no-date") return "No date";

  const diff = item.dueAt - now;
  const abs = Math.abs(diff);
  const mins = Math.max(1, Math.round(abs / 60_000));
  const hours = Math.floor(abs / HOUR_MS);
  const days = Math.floor(abs / DAY_MS);

  if (diff < 0) {
    if (mins < 60) return `Overdue ${mins}m`;
    if (hours < 24) return `Overdue ${hours}h`;
    return `Overdue ${days}d`;
  }
  if (mins < 60) return `${mins}m left`;
  if (hours < 24) return `${hours}h left`;
  return `${days}d left`;
}

const badgeStyleFor = (status) => {
  if (status === "overdue") return { background: "#fdecea", color: "#c62828", border: "1px solid #f5c2c0" };
  if (status === "urgent") return { background: "#fff4e5", color: "#c77700", border: "1px solid #ffd599" };
  if (status === "soon") return { background: "#fff0e3", color: "#d66f1a", border: "1px solid #f5b989" };
  if (status === "no-date") return { background: "#e8f3fc", color: "#0b6bcb", border: "1px solid #b6d8f7" };
  return { background: "#eef1f8", color: "#233a76", border: "1px solid #cfd8eb" };
};

const PopupApp = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    getDeadlines()
      .then((data) => {
        setItems(sortDeadlines(data?.items || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    return subscribeToDeadlines(refresh);
  }, []);

  const activeItems = items.filter(
    (item) => !item.completed && (item.source === "custom" || item.isCurrentSemester !== false)
  );
  const summary = computeBadgeSummary(items);

  const toggleDone = (item) => {
    updateDeadline(item.id, { completed: !item.completed })
      .then((res) => {
        if (res?.items) setItems(sortDeadlines(res.items));
      })
      .catch(() => {});
  };

  const openAcademy = () => {
    chrome.tabs.query({ url: "https://www.pesuacademy.com/*" }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const target = tabs[0];
        chrome.tabs.update(target.id, { active: true });
        chrome.tabs.sendMessage(target.id, { action: "openDeadlinesPage" }, () => {
          void chrome.runtime.lastError;
        });
      } else {
        chrome.tabs.create({ url: "https://www.pesuacademy.com/Academy/" });
      }
      window.close();
    });
  };

  return (
    <div
      style={{
        width: "340px",
        maxHeight: "460px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#ffffff",
        color: "#212121",
        margin: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid #e5e8f0",
          background: "#f8f9fc",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#233a76" }}>PESU-MAX</div>
          <div style={{ fontSize: "11px", color: "#666" }}>
            {summary.overdueCount > 0
              ? `${summary.overdueCount} overdue · ${summary.activeTotal} active`
              : `${summary.activeTotal} active deadline${summary.activeTotal === 1 ? "" : "s"}`}
          </div>
        </div>
        <button
          onClick={openAcademy}
          style={{
            background: "#f5821f",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open Portal
        </button>
      </div>

      <div style={{ padding: "10px 12px", overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", fontSize: "12px", color: "#666" }}>
            Loading deadlines...
          </div>
        ) : activeItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 8px", fontSize: "12.5px", color: "#666" }}>
            No active deadlines right now. Open PESU Academy to sync your courses or add custom due dates.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeItems.slice(0, 8).map((item) => {
              const status = getDeadlineStatus(item);
              const badge = badgeStyleFor(status);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e1e6f2",
                    background: status === "overdue" ? "#fff8f8" : "#ffffff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.completed)}
                    onChange={() => toggleDone(item)}
                    aria-label={`Mark ${item.title} completed`}
                    style={{ marginTop: "3px", accentColor: "#f5821f", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#f5821f" }}>
                        {item.subjectCode || (item.source === "pesu" ? "PESU" : "Custom")}
                      </span>
                      <span
                        style={{
                          ...badge,
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatShortCountdown(item)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: "#233a76",
                        marginTop: "2px",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.title}
                    </div>
                    {item.dueAt != null && (
                      <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                        Due {new Date(item.dueAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<PopupApp />);
}
