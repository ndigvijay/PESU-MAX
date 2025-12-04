import { load } from "../utils/storage.js";
import { getPESUDataPagination, getAllPESUDataNested } from "../helpers/getStorageData.js";
import { handleBulkDownload } from "../helpers/downloadController.js";
import { initializeDataSync } from "../initalizers/initialDataSave.js";

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
    handleBulkDownload(request.selectedItems, sender, sendResponse);
    return true;
  }
});

// Initialize data sync with alarms
initializeDataSync();
