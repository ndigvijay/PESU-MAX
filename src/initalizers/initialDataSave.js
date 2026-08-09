import { getAllSemesters, getCourseUnits, getUnitClasses, getUserProfile, getSemesterGpa, getSemesterDetails } from "../helpers/pesuAPI.js";
import { parseSemesters, parseCourseUnits, parseUnitClasses, parseUserProfile, parseGpaData, parseSemesterDetails } from "../helpers/parser.js";
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
    const existingPESUData = await load("pesuData");
    let semesters = await load("semestersData");
    if (!semesters?.length) {
      await fetchSemesters();
      semesters = await load("semestersData");
    }

    if (!semesters?.length) {
      console.error("No semesters data available");
      return;
    }

    const semesterSubjects = await parallelBatch(semesters, async (semester) => {
      try {
        const detailsHtml = await getSemesterDetails(semester.value);
        return parseSemesterDetails(detailsHtml).map((subject) => ({
          ...subject,
          semester: semester.number,
          semesterId: semester.value
        }));
      } catch (err) {
        console.error(`Error fetching semester details for semester ${semester.number}:`, err);
        return [];
      }
    }, 3);

    const subjects = semesterSubjects.flat();
    const subjectMap = new Map();

    for (const subject of subjects) {
      if (!subject?.id) {
        continue;
      }

      subjectMap.set(subject.id, subject);
    }

    const enrolledSubjects = Array.from(subjectMap.values());
    console.log(`Found ${enrolledSubjects.length} enrolled semester subjects`);

    const subjectsWithUnits = await parallelBatch(enrolledSubjects, async (subject) => {
      try {
        const unitsData = await getCourseUnits(subject.id);
        const units = unitsData ? parseCourseUnits(unitsData) : [];
        return { ...subject, units };
      } catch (err) {
        console.error(`Error fetching units for subject ${subject.id}:`, err);
        return { ...subject, units: [] };
      }
    }, 5);

    const allUnits = subjectsWithUnits.flatMap(subject =>
      (subject.units || []).filter((unit) => unit.id).map((unit) => ({ subjectId: subject.id, unit }))
    );

    const unitsWithClasses = await parallelBatch(allUnits, async ({ subjectId, unit }) => {
      try {
        const classesData = await getUnitClasses(subjectId, unit.id);
        const classes = classesData ? parseUnitClasses(classesData) : [];
        return { subjectId, unit: { ...unit, classes } };
      } catch (err) {
        console.error(`Error fetching classes for unit ${unit.id}:`, err);
        return { subjectId, unit: { ...unit, classes: [] } };
      }
    }, 5);

    const subjectsMap = {};
    for (const subject of subjectsWithUnits) {
      subjectsMap[subject.id] = {
        id: subject.id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        semester: subject.semester ?? null,
        semesterId: subject.semesterId ?? null,
        units: {}
      };
    }

    for (const { subjectId, unit } of unitsWithClasses) {
      if (subjectsMap[subjectId]) {
        subjectsMap[subjectId].units[unit.id] = {
          id: unit.id,
          name: unit.name || unit.unit || unit.unitNumber || "",
          classes: unit.classes
        };
      }
    }

    const mergedPESUData = mergePESUData(existingPESUData, {
      subjects: subjectsMap,
      allSubjects: enrolledSubjects
    });

    if (hasPESUDataChanged(existingPESUData, mergedPESUData)) {
      await save("pesuData", {
        ...mergedPESUData,
        fetchedAt: Date.now()
      });
      console.log("PESU data fetch complete and storage updated");
    } else {
      console.log("PESU data fetch complete with no storage changes");
    }

  } catch (err) {
    console.error("Error fetching PESU data:", err);
  }
}

function mergeItemsById(existingItems = [], incomingItems = []) {
  const mergedItems = new Map(
    existingItems
      .filter((item) => item?.id != null)
      .map((item) => [String(item.id), item])
  );

  for (const item of incomingItems) {
    if (item?.id == null) {
      continue;
    }

    const key = String(item.id);
    mergedItems.set(key, {
      ...mergedItems.get(key),
      ...item
    });
  }

  return Array.from(mergedItems.values());
}

function mergeUnits(existingUnits = {}, incomingUnits = {}) {
  const mergedUnits = { ...existingUnits };

  for (const unit of Object.values(incomingUnits)) {
    if (unit?.id == null) {
      continue;
    }

    const key = String(unit.id);
    const existingUnit = mergedUnits[key];
    mergedUnits[key] = {
      ...existingUnit,
      ...unit,
      classes: mergeItemsById(existingUnit?.classes, unit.classes)
    };
  }

  return mergedUnits;
}

function mergeSubjects(existingSubjects = {}, incomingSubjects = {}) {
  const mergedSubjects = { ...existingSubjects };

  for (const subject of Object.values(incomingSubjects)) {
    if (subject?.id == null) {
      continue;
    }

    const key = String(subject.id);
    const existingSubject = mergedSubjects[key];
    mergedSubjects[key] = {
      ...existingSubject,
      ...subject,
      units: mergeUnits(existingSubject?.units, subject.units)
    };
  }

  return mergedSubjects;
}

function mergePESUData(existingPESUData = {}, incomingPESUData = {}) {
  return {
    ...existingPESUData,
    subjects: mergeSubjects(existingPESUData?.subjects, incomingPESUData.subjects),
    allSubjects: mergeItemsById(existingPESUData?.allSubjects, incomingPESUData.allSubjects)
  };
}

function hasPESUDataChanged(existingPESUData, mergedPESUData) {
  return JSON.stringify({
    subjects: existingPESUData?.subjects || {},
    allSubjects: existingPESUData?.allSubjects || []
  }) !== JSON.stringify(mergedPESUData);
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

    // Sort by semester 
    gpaResults.sort((a, b) => a.semester - b.semester);

    let currentCgpa = 0;
    for (let i = gpaResults.length - 1; i >= 0; i--) {
      if (gpaResults[i].cgpa > 0) {
        currentCgpa = gpaResults[i].cgpa;
        break;
      }
    }

     save("gpaData", {
       semesters: gpaResults,
       currentCgpa: currentCgpa,
       fetchedAt: Date.now()
     });

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

function needsPesuDataRefresh(pesuData) {
  const subjects = Object.values(pesuData?.subjects || {});
  if (subjects.length === 0) {
    return true;
  }

  return subjects.some((subject) => subject.semester == null || subject.semesterId == null);
}

// get auth cookie
function fetchAndStorePESUSessionId() {
  chrome.cookies.get(
    { url: "https://www.pesuacademy.com/Academy/", name: "JSESSIONID" },
    (cookie) => {
      if (cookie) {
        save("JSESSIONID", cookie.value);
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
    if (!semesters?.length && !fetchLocks.semesters) {
      fetchLocks.semesters = true;
      await fetchSemesters().finally(() => { fetchLocks.semesters = false; });
      semesters = await load("semestersData");
    }

    if (needsPesuDataRefresh(pesuData) && !fetchLocks.pesuData) {
      fetchLocks.pesuData = true;
      // Save fetch status to storage so frontend can show indicator
      chrome.storage.local.set({ fetchStatus: { pesuData: true } });
      
      fetchAllPESUData().finally(() => {
        fetchLocks.pesuData = false;
        chrome.storage.local.set({ fetchStatus: { pesuData: false } });
      });
    }
    if (semesters?.length && !gpaData && !fetchLocks.gpaData) {
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
      const parsed = parseGpaData(html);
      return { html, parsed };
    },
    checkStorage: () => {
      chrome.storage.local.get(["gpaData", "semestersData", "userProfile"], console.log);
    }
  };
}
