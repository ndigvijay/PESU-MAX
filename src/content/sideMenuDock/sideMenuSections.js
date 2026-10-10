export const DOCK_SECTION_LIMIT = 6;
export const OTHER_CATEGORY = "Other";

export const MENU_SECTIONS = [
  { id: "menuTab_651", label: "Home", category: "Essentials" },
  { id: "menuTab_653", label: "My Courses", category: "Essentials" },
  { id: "menuTab_660", label: "My Attendance", category: "Essentials" },
  { id: "menuTab_652", label: "Results", category: "Essentials" },
  { id: "menuTab_655", label: "Seating Info", category: "Essentials" },
  { id: "menuTab_670", label: "My Profile", category: "Essentials" },

  { id: "menuTab_669", label: "Time Table", category: "Academics" },
  { id: "menuTab_668", label: "Calendar", category: "Academics" },
  { id: "menuTab_659", label: "Assignments", category: "Academics" },
  { id: "menuTab_75401", label: "My Quizzes", category: "Academics" },
  { id: "menuTab_658", label: "Hall Ticket", category: "Academics" },
  { id: "menuTab_10130", label: "Entrance Exam", category: "Academics" },
  { id: "menuTab_672", label: "Backlog Registration", category: "Academics" },
  { id: "menuTab_10945123", label: "Non Cognitive Skill Test", category: "Academics" },

  { id: "menuTab_679", label: "NEFT/RTGS Details", category: "Fees and payments" },
  { id: "menuTab_9999", label: "Online Payments", category: "Fees and payments" },
  { id: "menuTab_10945130", label: "Bank Consent", category: "Fees and payments" },

  { id: "menuTab_667", label: "Announcements", category: "Campus and support" },
  { id: "menuTab_801", label: "User Vehicle", category: "Campus and support" },
  { id: "menuTab_109", label: "Mentor Mentee", category: "Campus and support" },
  { id: "menuTab_680", label: "Student Grievance Redressal System", category: "Campus and support" },

  { id: "menuTab_109472", label: "My Placement Info", category: "Career" },
  { id: "menuTab_7536", label: "My Projects/Publications", category: "Career" }
];

export const SECTION_CATEGORIES = [...new Set(MENU_SECTIONS.map((section) => section.category))];

export const MENU_SECTION_IDS = MENU_SECTIONS.map((section) => section.id);

// Default Dock Sections (All Essentials)
export const DEFAULT_DOCK_SECTIONS = [
  "menuTab_651",
  "menuTab_653",
  "menuTab_660",
  "menuTab_652",
  "menuTab_655",
  "menuTab_670"
];

export function sectionFor(id) {
  return MENU_SECTIONS.find((section) => section.id === id) || null;
}

export function dockSections(value) {
  const chosen = Array.isArray(value) ? value : DEFAULT_DOCK_SECTIONS;
  return MENU_SECTION_IDS.filter((id) => chosen.includes(id)).slice(0, DOCK_SECTION_LIMIT);
}

export function extraSections(available) {
  const known = new Set(MENU_SECTION_IDS);
  return [...available.keys()].filter((id) => !known.has(id));
}
