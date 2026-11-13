import theme from "../../Themes/theme.jsx";
import { DAY_MS, HOUR_MS, getDeadlineStatus } from "../../../src/helpers/deadlineUtils.js";

export function formatDeadlineCountdown(deadline, now = Date.now()) {
  const status = getDeadlineStatus(deadline, now);
  if (status === "completed") return "Done";
  if (status === "no-date") return "No due date";

  const diff = deadline.dueAt - now;
  const abs = Math.abs(diff);
  const mins = Math.max(1, Math.round(abs / 60_000));
  const hours = Math.floor(abs / HOUR_MS);
  const days = Math.floor(abs / DAY_MS);

  if (diff < 0) {
    if (mins < 60) return `Overdue ${mins}m`;
    if (hours < 24) return `Overdue ${hours}h`;
    return `Overdue ${days}d`;
  }

  if (mins < 60) return `Due in ${mins}m`;
  if (hours < 24) return `Due in ${hours}h`;
  if (days === 1) return "Due in 1d";
  return `Due in ${days}d`;
}

export function formatDueDateDisplay(dueAt, hasTime = false) {
  if (dueAt == null) return "Due date not set";
  const date = new Date(dueAt);
  if (hasTime) {
    return date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getDeadlineStatusColors(status) {
  switch (status) {
    case "overdue":
      return {
        color: theme.colors.danger,
        bg: theme.colors.dangerTint,
        border: theme.colors.dangerBorder,
      };
    case "urgent":
      return {
        color: theme.colors.warning,
        bg: theme.colors.warningTint,
        border: theme.colors.warningBorder,
      };
    case "soon":
      return {
        color: theme.colors.primary,
        bg: theme.colors.primaryLight,
        border: theme.colors.primary,
      };
    case "completed":
      return {
        color: theme.colors.success,
        bg: theme.colors.successTint,
        border: theme.colors.successBorder,
      };
    case "no-date":
      return {
        color: theme.colors.info,
        bg: theme.colors.infoTint,
        border: theme.colors.infoBorder,
      };
    default:
      return {
        color: theme.colors.secondary,
        bg: theme.colors.secondaryLight,
        border: theme.colors.secondaryBorder,
      };
  }
}

export function toDateInputValue(dueAt) {
  if (dueAt == null) return "";
  const d = new Date(dueAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function toTimeInputValue(dueAt, hasTime) {
  if (dueAt == null || !hasTime) return "23:59";
  const d = new Date(dueAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

export function fromDateAndTimeInputs(dateStr, timeStr) {
  if (!dateStr) return { dueAt: null, hasTime: false };
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return { dueAt: null, hasTime: false };

  let hours = 23;
  let minutes = 59;
  let seconds = 59;
  let hasTime = false;

  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr) && timeStr !== "23:59") {
    const [h, m] = timeStr.split(":").map(Number);
    hours = h;
    minutes = m;
    seconds = 0;
    hasTime = true;
  }

  const dt = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  if (Number.isNaN(dt.getTime())) return { dueAt: null, hasTime: false };
  return { dueAt: dt.getTime(), hasTime };
}
