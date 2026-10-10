import { load, save } from "../../utils/storage.js";
import { SIDE_MENU_SECTIONS_KEY } from "../../utils/storageKeys.js";
import { SIDE_MENU_NAME_SELECTOR, SIDE_MENU_SELECTOR, menuItems } from "../academyPage.js";

export const DOCK_SECTION_LIMIT = 6;
export const OTHER_CATEGORY = "Other";
const DEFAULT_CATEGORY = "Essentials";

const CATEGORY_BY_ID = {
  menuTab_651: "Essentials",
  menuTab_653: "Essentials",
  menuTab_660: "Essentials",
  menuTab_652: "Essentials",
  menuTab_655: "Essentials",
  menuTab_670: "Essentials",

  menuTab_669: "Academics",
  menuTab_668: "Academics",
  menuTab_659: "Academics",
  menuTab_75401: "Academics",
  menuTab_658: "Academics",
  menuTab_10130: "Academics",
  menuTab_672: "Academics",
  menuTab_10945123: "Academics",

  menuTab_679: "Fees and payments",
  menuTab_9999: "Fees and payments",
  menuTab_10945130: "Fees and payments",

  menuTab_667: "Campus and support",
  menuTab_801: "Campus and support",
  menuTab_109: "Campus and support",
  menuTab_680: "Campus and support",

  menuTab_109472: "Career",
  menuTab_7536: "Career"
};

export const SECTION_CATEGORIES = [...new Set(Object.values(CATEGORY_BY_ID)), OTHER_CATEGORY];

export function sectionLabel(item) {
  const node = item.querySelector(SIDE_MENU_NAME_SELECTOR);
  return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
}

export function readMenuSections() {
  const list = document.querySelector(`${SIDE_MENU_SELECTOR} > ul`);
  if (!list) return [];
  return menuItems(list)
    .map((item) => ({ id: item.id, label: sectionLabel(item) }))
    .filter((section) => section.label);
}

export function menuSections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((section) => section && typeof section.id === "string" && typeof section.label === "string")
    .map(({ id, label }) => ({ id, label, category: CATEGORY_BY_ID[id] || OTHER_CATEGORY }));
}

const sectionsKey = (sections) =>
  sections.map(({ id, label }) => `${id}\n${label}`).sort().join("\n\n");

export async function storeMenuSections(found) {
  if (found.length === 0) return;
  const stored = menuSections(await load(SIDE_MENU_SECTIONS_KEY));
  if (sectionsKey(stored) === sectionsKey(found)) return;
  await save(SIDE_MENU_SECTIONS_KEY, found.map(({ id, label }) => ({ id, label })));
}

export function dockSections(value, sections) {
  const chosen = Array.isArray(value)
    ? value
    : sections.filter((section) => section.category === DEFAULT_CATEGORY).map((section) => section.id);
  return sections
    .map((section) => section.id)
    .filter((id) => chosen.includes(id))
    .slice(0, DOCK_SECTION_LIMIT);
}
