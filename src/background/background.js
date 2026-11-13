import { handleAcademySession } from "./academySession.js";
import { load } from "../utils/storage.js";
import { getPESUDataPagination, getAllPESUDataNested } from "../helpers/getStorageData.js";
import { handleBulkDownload, handleNotificationDownload } from "../helpers/downloadController.js";
import { fetchAllPESUData, initializeDataSync } from "../initalizers/initialDataSave.js";
import { getSemestersData } from "../helpers/MiscControllers.js";
import { searchProfessors, getProfessorDetails } from "../services/pesuStaff.js";
import { getAttendance, getSemesterGpa } from "../helpers/pesuAPI.js";
import { parseAttendance, parseGpaData } from "../helpers/parser.js";
import {
  downloadLibraryPyq,
  downloadLibraryPyqsZip,
  getPyqCourseCatalog,
  loadMoreLibraryPyqs,
  openLibraryPyq,
  searchLibraryPyqs
} from "../services/libraryPyq.js";
import {
  deleteDeadlineItem,
  downloadAssignmentFile,
  getAllDeadlinesPayload,
  initializeDeadlineTracker,
  saveCustomDeadline,
  sendTestDeadlineNotification,
  syncDeadlinesWithAcademy,
  updateDeadlineItem,
  updateDeadlineSettings
} from "../initalizers/deadlineCheck.js";

// get from storage and send to frontend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    request.action === "probeAcademySession" ||
    request.action === "readAcademySessionToken" ||
    request.action === "restoreAcademySession" ||
    request.action === "rememberAcademyCredentials"
  ) {
    handleAcademySession(request.action, request)
      .then((data) => sendResponse({ data }))
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

  if (request.action === "refetchPESUData") {
    chrome.storage.local.set({ fetchStatus: { pesuData: true } });

    fetchAllPESUData()
      .then(() => sendResponse({ data: true }))
      .catch((error) => sendResponse({ error: error.message }))
      .finally(() => {
        chrome.storage.local.set({ fetchStatus: { pesuData: false } });
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
      request.mergeMode,
      sender,
      sendResponse
    );
    return true;
  }

  if (request.action === "downloadResourceNotification") {
    handleNotificationDownload(request.notification, sendResponse);
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
      subjectName: request.subjectName
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "loadMoreLibraryPyqs") {
    loadMoreLibraryPyqs({
      query: request.query,
      year: request.year,
      subjectName: request.subjectName,
      cursor: request.cursor
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "downloadLibraryPyq") {
    downloadLibraryPyq(request.paper || {})
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "openLibraryPyq") {
    openLibraryPyq(request.paper || {})
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "downloadLibraryPyqsZip") {
    downloadLibraryPyqsZip({
      items: request.items,
      query: request.query
    })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "getDeadlines") {
    getAllDeadlinesPayload()
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "syncDeadlines") {
    syncDeadlinesWithAcademy({ force: Boolean(request.force) })
      .then((items) => getAllDeadlinesPayload().then((payload) => ({ ...payload, items })))
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "saveCustomDeadline") {
    saveCustomDeadline(request.deadline || {})
      .then((items) => sendResponse({ data: { items } }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "updateDeadline") {
    updateDeadlineItem(request.id, request.patch || {})
      .then((items) => sendResponse({ data: { items } }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "deleteDeadline") {
    deleteDeadlineItem(request.id)
      .then((items) => sendResponse({ data: { items } }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "updateDeadlineSettings") {
    updateDeadlineSettings(request.settings || {})
      .then((settings) => sendResponse({ data: { settings } }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "testDeadlineNotification") {
    sendTestDeadlineNotification()
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === "downloadDeadlineFile") {
    downloadAssignmentFile(request.file || {})
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

// Initialize data sync with alarms
initializeDataSync();
initializeDeadlineTracker();
