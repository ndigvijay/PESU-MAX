import { getSubjectsCode, getAllSemesters, getCourseUnits, getUnitClasses, getUserProfile } from "../helpers/pesuAPI.js";
import { parseSubjectsCode, parseSemesters, parseCourseUnits, parseUnitClasses, parseUserProfile } from "../helpers/parser.js";
import { filterEnggSubjectsCode } from "../helpers/enggSubjects.js";
import { save, load } from "../utils/storage.js";

// Save user profile data in chrome ext storage
export async function saveUserProfileData() {
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
export async function fetchAllPESUData() {
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

export async function fetchSemesters() {
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

// In-memory locks 
const fetchLocks = {
  sessionId: false,
  userProfile: false,
  semesters: false,
  pesuData: false
};

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
      fetchLocks.sessionId = false; // Release lock
    }
  );
}

// Check and fetch missing data 
async function syncMissingData() {
  let [sessionId, userProfile, semesters, pesuData] = await Promise.all([
    load("JSESSIONID"),
    load("userProfile"),
    load("semestersData"),
    load("pesuData")
  ]);

  // Always fetch session ID if missing
  if (!sessionId && !fetchLocks.sessionId) {
    fetchLocks.sessionId = true;
    fetchAndStorePESUSessionId();
  }

  // Fetch user profile if missing 
  if (!userProfile && !fetchLocks.userProfile) {
    fetchLocks.userProfile = true;
    await saveUserProfileData();
    fetchLocks.userProfile = false;
    // Reload profile to check if it was saved
    userProfile = await load("userProfile");
  }

  // Only fetch semesters and pesuData AFTER profile exists
  if (userProfile) {
    if (!semesters && !fetchLocks.semesters) {
      fetchLocks.semesters = true;
      fetchSemesters().finally(() => { fetchLocks.semesters = false; });
    }

    if (!pesuData && !fetchLocks.pesuData) {
      fetchLocks.pesuData = true;
      // Save fetch status to storage so frontend can show indicator
      chrome.storage.local.set({ fetchStatus: { pesuData: true } });
      
      fetchAllPESUData().finally(() => {
        fetchLocks.pesuData = false;
        chrome.storage.local.set({ fetchStatus: { pesuData: false } });
      });
    }
  }
}

// Initialize alarm  sync
export function initializeDataSync() {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("syncData", { periodInMinutes: 1 });
  });

  chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create("syncData", { periodInMinutes: 1 });
  });

  // Handle alarm - runs every 1 minute
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "syncData") {
      console.log("Syncing data");
      syncMissingData();
    }
  });

  // Run immediately on load
  syncMissingData();
}
