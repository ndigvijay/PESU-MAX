import {
  DEADLINES_KEY,
  DEADLINE_SETTINGS_KEY,
  DEADLINE_SYNC_STATUS_KEY,
} from "../utils/storageKeys.js";
import { inferSemesterFromCode, resolveCurrentSemesterNumber } from "../helpers/deadlineUtils.js";

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response?.data ?? null);
    });
  });
}

export const getDeadlines = () => sendMessage({ action: "getDeadlines" });

export const syncDeadlines = (force = false) =>
  sendMessage({ action: "syncDeadlines", force });

export const saveCustomDeadline = (deadline) =>
  sendMessage({ action: "saveCustomDeadline", deadline });

export const updateDeadline = (id, patch) =>
  sendMessage({ action: "updateDeadline", id, patch });

export const deleteDeadline = (id) =>
  sendMessage({ action: "deleteDeadline", id });

export const updateDeadlineSettings = (settings) =>
  sendMessage({ action: "updateDeadlineSettings", settings });

export const testDeadlineNotification = () =>
  sendMessage({ action: "testDeadlineNotification" });

export const downloadDeadlineFile = (file) =>
  sendMessage({ action: "downloadDeadlineFile", file });

export const getEnrolledCourseOptions = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pesuData", "userProfile", "semestersData"], (result) => {
      const subjects = Object.values(result.pesuData?.subjects || {});
      const currentSem = resolveCurrentSemesterNumber(result.userProfile, result.semestersData);
      const filtered = currentSem != null
        ? subjects.filter((s) => {
            const sem = s.semester ?? inferSemesterFromCode(s.subjectCode);
            return sem == null || sem === currentSem;
          })
        : subjects;

      const list = (filtered.length > 0 ? filtered : subjects).map((s) => ({
        subjectId: String(s.id),
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName || "",
        semester: s.semester ?? inferSemesterFromCode(s.subjectCode) ?? null,
      }));

      list.sort((a, b) => (a.subjectCode || a.subjectName).localeCompare(b.subjectCode || b.subjectName));
      resolve(list);
    });
  });
};

export const subscribeToDeadlines = (onChange) => {
  const listener = (changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes[DEADLINES_KEY] ||
      changes[DEADLINE_SETTINGS_KEY] ||
      changes[DEADLINE_SYNC_STATUS_KEY] ||
      changes.pesuData
    ) {
      onChange();
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};
