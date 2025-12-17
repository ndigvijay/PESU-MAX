import { getSubjectsCode, getAllSemesters, getCourseUnits, getUnitClasses, getUserProfile, getSemesterGpa } from "../helpers/pesuAPI.js";
import { parseSubjectsCode, parseSemesters, parseCourseUnits, parseUnitClasses, parseUserProfile, parseGpaData } from "../helpers/parser.js";
import { filterEnggSubjectsCode } from "../helpers/enggSubjects.js";
import { save, load } from "../utils/storage.js";
import { parallelBatch } from "../helpers/MiscControllers.js";

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

    const subjectsWithUnits = await parallelBatch(enggSubjects, async (subject) => {
      if (!subject.id) return null;
      try {
        const unitsData = await getCourseUnits(subject.id);
        const units = unitsData ? parseCourseUnits(unitsData) : [];
        return { ...subject, units };
      } catch (err) {
        console.error(`Error fetching units for subject ${subject.id}:`, err);
        return { ...subject, units: [] };
      }
    }, 5);

    const validSubjects = subjectsWithUnits.filter(s => s !== null);

    const allUnits = validSubjects.flatMap(s => 
      s.units.filter(u => u.id).map(u => ({ subjectId: s.id, unit: u }))
    );

    const unitsWithClasses = await parallelBatch(allUnits, async ({ subjectId, unit }) => {
      try {
        const classesData = await getUnitClasses(unit.id);
        const classes = classesData ? parseUnitClasses(classesData) : [];
        return { subjectId, unit: { ...unit, classes } };
      } catch (err) {
        console.error(`Error fetching classes for unit ${unit.id}:`, err);
        return { subjectId, unit: { ...unit, classes: [] } };
      }
    }, 5);

    const subjectsMap = {};
    for (const subject of validSubjects) {
      subjectsMap[subject.id] = {
        id: subject.id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        units: {}
      };
    }

    for (const { subjectId, unit } of unitsWithClasses) {
      if (subjectsMap[subjectId]) {
        subjectsMap[subjectId].units[unit.id] = {
          id: unit.id,
          name: unit.name,
          classes: unit.classes
        };
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

export async function fetchAllGpaData() {
  try {
    const semesters = await load("semestersData");
    if (!semesters?.length) {
      console.log("No semesters data available for GPA fetch");
      return;
    }

    const gpaResults = [];
    let currentCgpa = 0;

    for (const sem of semesters) {
      try {
        const html = await getSemesterGpa(sem.value);
        const data = parseGpaData(html);
        
        gpaResults.push({
          semester: sem.number,
          semesterId: sem.value,
          credits: data.earnedCredits,
          totalCredits: data.totalCredits,
          sgpa: data.sgpa,
          cgpa: data.cgpa,
          fromApi: true
        });

        if (data.cgpa > 0) {
          currentCgpa = data.cgpa;
        }
      } catch (err) {
        console.error(`Error fetching GPA for semester ${sem.number}:`, err);
        gpaResults.push({
          semester: sem.number,
          semesterId: sem.value,
          credits: 0,
          totalCredits: 0,
          sgpa: 0,
          cgpa: 0,
          fromApi: true
        });
      }
    }

    gpaResults.sort((a, b) => a.semester - b.semester);

    save("gpaData", {
      semesters: gpaResults,
      currentCgpa: currentCgpa,
      fetchedAt: Date.now()
    });

    console.log("GPA data saved:", gpaResults);
  } catch (err) {
    console.error("Error fetching GPA data:", err);
  }
}

// In-memory locks 
const fetchLocks = {
  sessionId: false,
  userProfile: false,
  semesters: false,
  pesuData: false,
  gpaData: false
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
  let [sessionId, userProfile, semesters, pesuData, gpaData] = await Promise.all([
    load("JSESSIONID"),
    load("userProfile"),
    load("semestersData"),
    load("pesuData"),
    load("gpaData")
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
    if (semesters && !gpaData && !fetchLocks.gpaData) {
      fetchLocks.gpaData = true;
      chrome.storage.local.set({ fetchStatus: { gpaData: true } });
      
      fetchAllGpaData().finally(() => {
        fetchLocks.gpaData = false;
        chrome.storage.local.set({ fetchStatus: { gpaData: false } });
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

  // Trigger sync when user logs in
  chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cookie.name === "JSESSIONID" && 
        changeInfo.cookie.domain.includes("pesuacademy.com") &&
        !changeInfo.removed) {
      console.log("Login detected, syncing data...");
      syncMissingData();
    }
  });

  // Run immediately on load
  syncMissingData();

  globalThis.debugPESU = {
    fetchAllGpaData,
    fetchSemesters,
    syncMissingData,
    testGpaFetch: async (semesterId) => {
      const { getSemesterGpa } = await import("../helpers/pesuAPI.js");
      const { parseGpaData } = await import("../helpers/parser.js");
      const html = await getSemesterGpa(semesterId);
      console.log("Raw HTML:", html);
      const parsed = parseGpaData(html);
      console.log("Parsed:", parsed);
      return { html, parsed };
    },
    checkStorage: () => {
      chrome.storage.local.get(["gpaData", "semestersData", "userProfile"], console.log);
    }
  };
  console.log("Debug functions available: globalThis.debugPESU");
}
