import { getSubjectsCode, getAllSemesters, getCourseUnits, getUnitClasses, getUserProfile } from "../helpers/pesuAPI.js";
import { parseSubjectsCode, parseSemesters, parseCourseUnits, parseUnitClasses, parseUserProfile } from "../helpers/parser.js";
import { filterEnggSubjectsCode, getSubjectDetails } from "../helpers/enggSubjects.js";
import { save, load } from "../utils/storage.js";
import { getPESUDataPagination } from "../helpers/getStorageData.js";
import { createBulkDownloadZip } from "../helpers/downloadHelper.js";

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

// Save user profile data in chrome ext storage
async function saveUserProfileData() {
  try {
    const profileHtml = await getUserProfile();
    if (!profileHtml) {
      console.error("No profile data received");
      return;
    }

    const profile = parseUserProfile(profileHtml);
    if (profile) {
      save("userProfile", profile);
      console.log("User profile saved:", profile);
    } else {
      console.warn("Could not parse profile, storing raw data");
      save("userProfileRaw", profileHtml);
    }
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }
}

// Fetch and store all PESU data
async function fetchAllPESUData() {
  try {
    const subjectsData = await getSubjectsCode();
    if (!subjectsData) {
      console.error("No subjects data received");
      return;
    }
    
    const subjects = parseSubjectsCode(subjectsData);
    const enggSubjects = await filterEnggSubjectsCode(subjects);
    console.log(`Found ${enggSubjects.length} engineering subjects`);

    const subjectsMap = {};
    
    for (const subject of enggSubjects) {
      if (!subject.id) continue;
      
      subjectsMap[subject.id] = {
        id: subject.id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        units: {}
      };

      try {
        const unitsData = await getCourseUnits(subject.id);
        if (!unitsData) continue;
        
        const units = parseCourseUnits(unitsData);
        if (units.length === 0) continue;
        
        console.log(`Subject ${subject.subjectCode}: ${units.length} units`);

        for (const unit of units) {
          if (!unit.id) continue;
          
          subjectsMap[subject.id].units[unit.id] = {
            id: unit.id,
            name: unit.name,
            classes: []
          };

          try {
            const classesData = await getUnitClasses(unit.id);
            if (!classesData) continue;
            
            const classes = parseUnitClasses(classesData);
            if (classes.length > 0) {
              subjectsMap[subject.id].units[unit.id].classes = classes;
            }
          } catch (err) {
            console.error(`Error fetching classes for unit ${unit.id}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error fetching units for subject ${subject.id}:`, err);
      }
    }

    save("pesuData", {
      subjects: subjectsMap,
      allSubjects: subjects,
      fetchedAt: Date.now()
    });
    console.log("PESU data fetch complete");

  } catch (err) {
    console.error("Error fetching PESU data:", err);
  }
}

async function fetchSemesters() {
  try {
    const data = await getAllSemesters();
    if (data) {
      const semesterData = parseSemesters(data);
      save("semestersData", semesterData);
      console.log(`Found ${semesterData.length} semesters`);
    }
  } catch (err) {
    console.error("Error fetching semesters:", err);
  }
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
    const { selectedItems } = request;
    
    if (!selectedItems || selectedItems.length === 0) {
      sendResponse({ error: "No items selected" });
      return true;
    }

    // Track download progress via port for real-time updates
    let port = null;
    if (sender.tab?.id) {
      try {
        port = chrome.tabs.connect(sender.tab.id, { name: "downloadProgress" });
      } catch (e) {
        console.log("Could not establish progress port");
      }
    }

    const progressCallback = (progress) => {
      if (port) {
        try {
          port.postMessage(progress);
        } catch (e) {
          // Port may be disconnected
        }
      }
    };

    createBulkDownloadZip(selectedItems, progressCallback)
      .then(async (result) => {
        // Convert blob to base64 for transfer to content script
        const arrayBuffer = await result.blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        sendResponse({
          success: true,
          data: base64,
          mimeType: 'application/zip',
          stats: result.stats
        });
        
        if (port) {
          try {
            port.disconnect();
          } catch (e) {}
        }
      })
      .catch((error) => {
        console.error("Bulk download error:", error);
        sendResponse({ error: error.message });
        
        if (port) {
          try {
            port.disconnect();
          } catch (e) {}
        }
      });

    return true;
  }
});

// Run fetches
// fetchAndStorePESUSessionId();
// saveUserProfileData();
// fetchSemesters();
// fetchAllPESUData();




