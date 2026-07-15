import { load } from "../utils/storage.js";
import { getPESUDataPagination, getAllPESUDataNested } from "../helpers/getStorageData.js";
import { handleBulkDownload } from "../helpers/downloadController.js";
import { initializeDataSync } from "../initalizers/initialDataSave.js";
import { getSemestersData } from "../helpers/MiscControllers.js";
import { searchProfessors, getProfessorDetails } from "../services/pesuStaff.js";
import { getAttendance, getSemesterGpa } from "../helpers/pesuAPI.js";
import { parseAttendance, parseGpaData } from "../helpers/parser.js";
import {
  downloadLibraryPyq,
  downloadLibraryPyqsZip,
  getPyqCourseCatalog,
  loadMoreLibraryPyqs,
  loginLibraryWithCredentials,
  searchLibraryPyqs
} from "../services/libraryPyq.js";

const NAVIGATION_STATE_PREFIX = "pesuNavigationState:";
const MAX_NAVIGATION_ENTRIES = 50;
const NAVIGATION_TTL_MS = 30 * 60 * 1000;

function navigationStateKey(tabId) {
  return `${NAVIGATION_STATE_PREFIX}${tabId}`;
}

async function getNavigationState(tabId) {
  const key = navigationStateKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return stored[key] || {
    entries: [],
    index: -1,
    currentEntryId: null,
    pendingRestore: null,
    recoveryAttempted: false
  };
}

async function setNavigationState(tabId, state) {
  await chrome.storage.session.set({ [navigationStateKey(tabId)]: state });
}

async function recordNavigation(tabId, entry) {
  const state = await getNavigationState(tabId);
  if (entry.base) {
    await setNavigationState(tabId, {
      entries: [entry],
      index: 0,
      currentEntryId: entry.id,
      pendingRestore: null,
      recoveryAttempted: false
    });
    return;
  }

  const entries = state.entries.slice(0, state.index + 1);
  entries.push(entry);

  if (entries.length > MAX_NAVIGATION_ENTRIES) {
    entries.splice(0, entries.length - MAX_NAVIGATION_ENTRIES);
  }

  await setNavigationState(tabId, {
    entries,
    index: entries.length - 1,
    currentEntryId: entry.id,
    pendingRestore: null,
    recoveryAttempted: false
  });
}

async function selectNavigationEntry(tabId, entryId) {
  const state = await getNavigationState(tabId);
  const index = state.entries.findIndex((entry) => entry.id === entryId);
  if (!state.entries[index]) {
    return null;
  }

  state.index = index;
  state.currentEntryId = entryId;
  state.pendingRestore = state.entries[index];
  await setNavigationState(tabId, state);
  return state.pendingRestore;
}

async function recoverPreviousNavigation(tabId) {
  const state = await getNavigationState(tabId);
  if (state.recoveryAttempted) {
    return null;
  }
  const current = state.entries.find((entry) => entry.id === state.currentEntryId)
    || state.entries[state.index];
  const entry = state.entries.find((candidate) => candidate.id === current?.parentId);

  if (!entry || Date.now() - entry.createdAt > NAVIGATION_TTL_MS) {
    return null;
  }

  state.index = state.entries.indexOf(entry);
  state.currentEntryId = entry.id;
  state.pendingRestore = entry;
  state.recoveryAttempted = true;
  await setNavigationState(tabId, state);
  return entry;
}

async function consumePendingNavigation(tabId) {
  const state = await getNavigationState(tabId);
  const entry = state.pendingRestore;
  state.pendingRestore = null;
  await setNavigationState(tabId, state);
  return entry || null;
}

// get from storage and send to frontend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (request.action === "recordNavigation" && tabId !== undefined) {
    recordNavigation(tabId, request.entry)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "activateNavigation" && tabId !== undefined) {
    selectNavigationEntry(tabId, request.entryId)
      .then((entry) => sendResponse({ entry }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "recoverPreviousNavigation" && tabId !== undefined) {
    recoverPreviousNavigation(tabId)
      .then((entry) => sendResponse({ entry }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "consumePendingNavigation" && tabId !== undefined) {
    consumePendingNavigation(tabId)
      .then((entry) => sendResponse({ entry }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "clearNavigation" && tabId !== undefined) {
    chrome.storage.session.remove(navigationStateKey(tabId))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "getPESUData") {
    load("pesuData").then((data) => {
      sendResponse({
        data: data
      });
    }).catch((error) => {
      sendResponse({
        error: error.message
      });
    });
    return true; 
  }

  if (request.action === "getPESUDataPagination") {
    getPESUDataPagination(request)
      .then((result) => {
        sendResponse({ data: result });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.action === "getAllPESUData") {
    getAllPESUDataNested()
      .then((result) => {
        sendResponse({ data: result });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.action === "downloadSelectedMaterials") {
    // 2=slides, 3=notes, 5=assignments, 6=qb, 7=qa
    // If not provided, defaults to slides only [2]
    handleBulkDownload(
      request.selectedItems,
      request.contentTypes,
      request.mergeOptions,
      request.mergeSlides,
      sender,
      sendResponse
    );
    return true;
  }

  if (request.action === "getSemestersData") {
    getSemestersData()
      .then((data) => {
        sendResponse({ data: data });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (request.action === "searchProfessors") {
    searchProfessors(request.searchQuery)
      .then((professors) => {
        sendResponse({ data: professors });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (request.action === "getProfessorDetails") {
    getProfessorDetails(request.professorId)
      .then((data) => {
        sendResponse({ data: data });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (request.action === "getAttendance") {
    getAttendance(request.semesterId)
      .then((html) => parseAttendance(html))
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "getGpaForSemester") {
    getSemesterGpa(request.semesterId)
      .then((html) => parseGpaData(html))
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "libraryLogin") {
    loginLibraryWithCredentials({
      encodedMemberId: request.encodedMemberId,
      encodedPassword: request.encodedPassword
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "getPYQCourseCatalog") {
    getPyqCourseCatalog()
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "searchLibraryPyqs") {
    searchLibraryPyqs({
      query: request.query,
      year: request.year,
      encodedMemberId: request.encodedMemberId,
      encodedPassword: request.encodedPassword
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "loadMoreLibraryPyqs") {
    loadMoreLibraryPyqs({
      query: request.query,
      year: request.year,
      cursor: request.cursor,
      loadedCount: request.loadedCount,
      encodedMemberId: request.encodedMemberId,
      encodedPassword: request.encodedPassword
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "downloadLibraryPyq") {
    downloadLibraryPyq({
      downloadPath: request.downloadPath,
      title: request.title,
      encodedMemberId: request.encodedMemberId,
      encodedPassword: request.encodedPassword
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "downloadLibraryPyqsZip") {
    downloadLibraryPyqsZip({
      items: request.items,
      query: request.query,
      encodedMemberId: request.encodedMemberId,
      encodedPassword: request.encodedPassword
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(navigationStateKey(tabId));
});

// Initialize data sync with alarms
initializeDataSync();
