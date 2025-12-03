import { getSubjectsCode, getAllSemesters, getCourseUnits, getUnitClasses, getUserProfile } from "../helpers/pesuAPI.js";
import { parseSubjectsCode, parseSemesters, parseCourseUnits, parseUnitClasses, parseUserProfile } from "../helpers/parser.js";
import { filterEnggSubjectsCode, getSubjectDetails } from "../helpers/enggSubjects.js";
function fetchAndStorePESUSessionId() {
  chrome.cookies.get(
    { url: "https://www.pesuacademy.com/Academy/", name: "JSESSIONID" },
    (cookie) => {
      if (cookie) {
        chrome.storage.local.set({ JSESSIONID: cookie.value });
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
      chrome.storage.local.set({ userProfile: profile });
      console.log("User profile saved:", profile);
    } else {
      // If parsing fails, store raw HTML for debugging
      console.warn("Could not parse profile, storing raw data");
      chrome.storage.local.set({ userProfileRaw: profileHtml });
    }
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }
}

// Fetch and store all PESU data
async function fetchAllPESUData() {
  try {
    // Step 1: Get subjects
    const subjectsData = await getSubjectsCode();
    if (!subjectsData) {
      console.error("No subjects data received");
      return;
    }
    
    const subjects = parseSubjectsCode(subjectsData);
    chrome.storage.local.set({ subjects: subjects });
    
    const enggSubjects = await filterEnggSubjectsCode(subjects);
    chrome.storage.local.set({ enggSubjects: enggSubjects });
    console.log(`Found ${enggSubjects.length} engineering subjects`);

    // Step 2: Get course units for each engineering subject (sequentially to avoid rate limiting)
    const courseUnits = {};
    const unitClasses = {};

    for (const subject of enggSubjects) {
      try {
        if (!subject.id) continue;
        
        const unitsData = await getCourseUnits(subject.id);
        if (!unitsData) continue;
        
        const units = parseCourseUnits(unitsData);
        if (units.length === 0) continue;
        
        courseUnits[subject.id] = units;
        console.log(`Subject ${subject.subjectCode}: ${units.length} units`);

        // Step 3: Get classes for each unit
        for (const unit of units) {
          try {
            if (!unit.id) continue;
            
            const classesData = await getUnitClasses(unit.id);
            if (!classesData) continue;
            
            const classes = parseUnitClasses(classesData);
            if (classes.length > 0) {
              unitClasses[unit.id] = classes;
            }
          } catch (err) {
            console.error(`Error fetching classes for unit ${unit.id}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error fetching units for subject ${subject.id}:`, err);
      }
    }

    // Store all data at once
    chrome.storage.local.set({ courseUnits: courseUnits });
    chrome.storage.local.set({ unitClasses: unitClasses });
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
      chrome.storage.local.set({ semestersData: semesterData });
      console.log(`Found ${semesterData.length} semesters`);
    }
  } catch (err) {
    console.error("Error fetching semesters:", err);
  }
}

// Run fetches
fetchAndStorePESUSessionId();
saveUserProfileData();
fetchSemesters();
fetchAllPESUData();




// Export if needed
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_SESSION") {
    fetchAndStorePESUSessionId();
    sendResponse({ status: "ok" });
  }
});
