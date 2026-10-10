import { load } from "../../utils/storage.js";
import { SIDE_MENU_DOCK_KEY, SIDE_MENU_DOCK_SECTIONS_KEY } from "../../utils/storageKeys.js";
import {
  SIDE_MENU_CONTENT_SELECTOR,
  SIDE_MENU_NAME_SELECTOR,
  SIDE_MENU_SELECTOR,
  menuItems
} from "../academyPage.js";
import { MENU_ICON_BY_ID } from "../menuIcons/menuIconsApply.js";
import { PANEL_ID, buildAllSectionsPanel } from "./allSectionsPanel.js";
import { glyph } from "./dockIcon.js";
import { DOCK_ATTR, writeDockMirror } from "./dockState.js";
import { dockSections, sectionFor } from "./sideMenuSections.js";

export const DOCK_ID = "pesu-max-dock";
export const ALL_BUTTON_ID = "pesu-max-dock-all";
export const DOCK_ACTIVE_ATTR = "data-pesu-max-dock-active";
export const DOCK_ELSEWHERE_ATTR = "data-pesu-max-dock-elsewhere";

const LIST_SELECTOR = `${SIDE_MENU_SELECTOR} > ul`;
const ACTIVE_CLASS = "active";

let mounted = null;
let sectionsValue = null;
let building = false;
let scheduled = false;
let railObserver = null;
let savedWidths = null;

const menuList = () => document.querySelector(LIST_SELECTOR);

export const isDockOn = () => document.documentElement.hasAttribute(DOCK_ATTR);

function siteLabel(item) {
  const node = item.querySelector(SIDE_MENU_NAME_SELECTOR);
  return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
}

function labelFor(id, available) {
  const section = sectionFor(id);
  return section ? section.label : available.get(id);
}

function labelledButton(iconName, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pesu-max-dock-item";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(glyph(iconName));

  const text = document.createElement("span");
  text.className = "pesu-max-dock-label";
  text.textContent = label;
  button.appendChild(text);
  return button;
}

function dockButton(id, label) {
  const button = labelledButton(MENU_ICON_BY_ID[id] || "Menu", label);
  button.dataset.pesuMaxDockSection = id;
  button.addEventListener("click", () => selectSection(id));
  return button;
}

function allButton() {
  const button = labelledButton("GridView", "All");
  button.id = ALL_BUTTON_ID;
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", PANEL_ID);
  return button;
}

function selectSection(id) {
  if (mounted) mounted.panel.close();
  const item = document.getElementById(id);
  const link = item && item.querySelector("a");
  if (link) link.click();
}

function syncActive() {
  const list = menuList();
  if (!list || !mounted) return;

  const active = menuItems(list).find((item) => item.classList.contains(ACTIVE_CLASS));
  const id = active ? active.id : "";

  mounted.items.forEach((button, key) => {
    const isActive = key === id;
    button.toggleAttribute(DOCK_ACTIVE_ATTR, isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  mounted.all.toggleAttribute(DOCK_ELSEWHERE_ATTR, Boolean(id) && !mounted.items.has(id));
  mounted.panel.setActive(id);
}

function build(sections) {
  const list = menuList();
  const menu = document.querySelector(SIDE_MENU_SELECTOR);
  if (!list || !menu) return null;

  building = true;
  const available = new Map(menuItems(list).map((item) => [item.id, siteLabel(item)]));

  const nav = document.createElement("nav");
  nav.id = DOCK_ID;
  nav.setAttribute("aria-label", "Sections");

  const items = new Map();
  sections
    .filter((id) => available.has(id))
    .forEach((id) => {
      const button = dockButton(id, labelFor(id, available));
      items.set(id, button);
      nav.appendChild(button);
    });

  const all = allButton();
  nav.appendChild(all);

  const panel = buildAllSectionsPanel({ available, trigger: all, onSelect: selectSection });
  all.addEventListener("click", () => panel.toggle());

  menu.appendChild(nav);
  document.body.appendChild(panel.element);
  document.body.appendChild(panel.scrim);

  const listObserver = new MutationObserver(scheduleRefresh);
  listObserver.observe(menu, { childList: true, subtree: true });
  const classObserver = new MutationObserver(syncActive);
  classObserver.observe(list, { attributes: true, attributeFilter: ["class"], subtree: true });

  building = false;
  return { list, nav, items, all, panel, observers: [listObserver, classObserver] };
}

function teardown() {
  releaseRailWidth();
  if (!mounted) return;
  mounted.observers.forEach((observer) => observer.disconnect());
  mounted.panel.destroy();
  mounted.nav.remove();
  mounted = null;
}

function mount(sections) {
  const next = build(sections);
  if (!next) return false;
  mounted = next;
  return true;
}

function claimRailWidth() {
  const rail = document.querySelector(SIDE_MENU_SELECTOR);
  const content = document.querySelector(SIDE_MENU_CONTENT_SELECTOR);

  if (!savedWidths) {
    savedWidths = {
      rail: rail ? rail.style.width : "",
      content: content ? content.style.width : ""
    };
  }

  const clear = () => {
    if (rail) rail.style.removeProperty("width");
    if (content) content.style.removeProperty("width");
  };

  clear();
  if (!rail || railObserver) return;

  railObserver = new MutationObserver(clear);
  railObserver.observe(rail, { attributes: true, attributeFilter: ["style"] });
  if (content) railObserver.observe(content, { attributes: true, attributeFilter: ["style"] });
}

// Restore the side menu to its previous state. Including expanded or collapsed state.
function releaseRailWidth() {
  if (railObserver) {
    railObserver.disconnect();
    railObserver = null;
  }
  if (!savedWidths) return;

  const rail = document.querySelector(SIDE_MENU_SELECTOR);
  const content = document.querySelector(SIDE_MENU_CONTENT_SELECTOR);
  if (rail && savedWidths.rail) rail.style.width = savedWidths.rail;
  if (content && savedWidths.content) content.style.width = savedWidths.content;
  savedWidths = null;
}

function refresh() {
  if (!mounted) return;
  if (menuList() !== mounted.list) {
    teardown();
    if (mount(sectionsValue)) syncActive();
    return;
  }
  syncActive();
}

function scheduleRefresh() {
  if (building || scheduled || !mounted) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    refresh();
  });
}

function apply(enabled, value) {
  const root = document.documentElement;
  writeDockMirror(enabled);
  teardown();

  if (!enabled) {
    root.removeAttribute(DOCK_ATTR);
    return;
  }

  sectionsValue = dockSections(value);
  claimRailWidth();
  if (!mount(sectionsValue)) {
    root.removeAttribute(DOCK_ATTR);
    return;
  }

  root.setAttribute(DOCK_ATTR, "");
  syncActive();
}

// Off by default.
export async function initSideMenuDock() {
  const [enabled, value] = await Promise.all([
    load(SIDE_MENU_DOCK_KEY),
    load(SIDE_MENU_DOCK_SECTIONS_KEY)
  ]);
  apply(enabled === true, value);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes[SIDE_MENU_DOCK_KEY] && !changes[SIDE_MENU_DOCK_SECTIONS_KEY]) return;
    Promise.all([load(SIDE_MENU_DOCK_KEY), load(SIDE_MENU_DOCK_SECTIONS_KEY)])
      .then(([next, sections]) => apply(next === true, sections))
      .catch(() => { });
  });
}
