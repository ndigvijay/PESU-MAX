import { load } from "../utils/storage.js";
import { getPESUDataPagination, getAllPESUDataNested } from "../helpers/getStorageData.js";
import { handleBulkDownload } from "../helpers/downloadController.js";
import { initializeDataSync } from "../initalizers/initialDataSave.js";
import { getSemestersData } from "../helpers/MiscControllers.js";
import { searchProfessors, getProfessorDetails } from "../services/pesuStaff.js";
import { getAttendance } from "../helpers/pesuAPI.js";
import { parseAttendance } from "../helpers/parser.js";

// get from storage and send to frontend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    handleBulkDownload(request.selectedItems, request.contentTypes, sender, sendResponse);
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
});

// Initialize data sync with alarms
initializeDataSync();
