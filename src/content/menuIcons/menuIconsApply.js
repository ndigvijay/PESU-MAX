import { MENU_ICON_PATHS } from "./menuIconPaths.js";
import { MENU_ITEM_ID_PREFIX } from "../academyPage.js";
import { TOGGLE_ROW_ID } from "../hideTopBar.js";

export const MENU_ICON_ATTR = "data-pesu-max-icon";
export const MENU_ICONS_ATTR = "data-pesu-max-menu-icons";
export const MENU_ICON_CLASS = "pesu-max-menu-icon";

const ORIGINAL_CLASSES_ATTR = "data-pesu-max-icon-classes";
const SVG_NS = "http://www.w3.org/2000/svg";
const GLYPH_CLASS_PATTERN = /^(pesu-icon-|pesu-ico-|glyphicon|fa)/;

// icon mapped to section
export const MENU_ICON_BY_ID = {
  menuTab_651: "Home",
  menuTab_653: "AutoStories",
  menuTab_660: "Checklist",
  menuTab_669: "AccessTime",
  menuTab_652: "EmojiEvents",
  menuTab_10945130: "VerifiedUser",
  menuTab_679: "ReceiptLong",
  menuTab_9999: "Payments",
  menuTab_680: "SupportAgent",
  menuTab_655: "Chair",
  menuTab_75401: "Quiz",
  menuTab_10130: "HistoryEdu",
  menuTab_668: "CalendarMonth",
  menuTab_667: "Campaign",
  menuTab_801: "DirectionsCar",
  menuTab_670: "AccountCircle",
  menuTab_672: "BookmarkAdded",
  menuTab_7536: "Article",
  menuTab_109: "SupervisorAccount",
  menuTab_658: "ConfirmationNumber",
  menuTab_659: "Assignment",
  menuTab_10945123: "Psychology",
  menuTab_109472: "Work",
  [TOGGLE_ROW_ID]: "Menu",
};

// Filled when Outlined is not preferred
const FILLED_ICONS = new Set(["DirectionsCar"]);

const iconPaths = (name) =>
  MENU_ICON_PATHS[FILLED_ICONS.has(name) ? name : `${name}Outlined`] || null;

export function buildIcon(name) {
  const paths = iconPaths(name);
  if (!paths) return null;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add(MENU_ICON_CLASS);
  paths.forEach((data) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", data);
    svg.appendChild(path);
  });
  return svg;
}

function applyRow(row) {
  const name = MENU_ICON_BY_ID[row.id];
  if (!name || row.getAttribute(MENU_ICON_ATTR) === name) return;

  const holder = row.querySelector(".menu-image");
  if (!holder) return;

  const icon = buildIcon(name);
  if (!icon) return;

  holder.setAttribute(ORIGINAL_CLASSES_ATTR, holder.className);
  [...holder.classList].forEach((token) => {
    if (GLYPH_CLASS_PATTERN.test(token)) holder.classList.remove(token);
  });
  holder.replaceChildren(icon);
  row.setAttribute(MENU_ICON_ATTR, name);
}

function restoreRow(row) {
  if (!row.hasAttribute(MENU_ICON_ATTR)) return;

  const holder = row.querySelector(".menu-image");
  if (!holder) return;

  const original = holder.getAttribute(ORIGINAL_CLASSES_ATTR);
  if (original !== null) holder.className = original;
  holder.removeAttribute(ORIGINAL_CLASSES_ATTR);
  holder.replaceChildren();
  row.removeAttribute(MENU_ICON_ATTR);
}

export function menuIconRows() {
  return document.querySelectorAll(`li[id^="${MENU_ITEM_ID_PREFIX}"], #${TOGGLE_ROW_ID}`);
}

export function applyMenuIcons(enabled) {
  menuIconRows().forEach((row) => {
    if (enabled) applyRow(row);
    else restoreRow(row);
  });
}
