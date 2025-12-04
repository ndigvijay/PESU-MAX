import { save, load } from "../utils/storage.js";
import { getPESUDataPagination } from "../helpers/getStorageData.js";
import { handleBulkDownload } from "../helpers/downloadController.js";
import { saveUserProfileData, fetchAllPESUData, fetchSemesters } from "../initalizers/initialDataSave.js";

// get auth cookie
function fetchAndStorePESUSessionId() {
  chrome.cookies.get(
    { url: "https://www.pesuacademy.com/Academy/", name: "JSESSIONID" },
    (cookie) => {
      if (cookie) {
        save("JSESSIONID", cookie.value);
        console.log("Stored JSESSIONID:", cookie.value);
      } else {
        console.log("JSESSIONID cookie not found");
      }
    }
  );
}



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

  if (request.action === "downloadSelectedMaterials") {
    handleBulkDownload(request.selectedItems, sender, sendResponse);
    return true;
  }
});

// Run fetches
// fetchAndStorePESUSessionId();
// saveUserProfileData();
// fetchSemesters();
// fetchAllPESUData();




