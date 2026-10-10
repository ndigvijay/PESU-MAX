import { MENU_ICON_BY_ID } from "../menuIcons/menuIconsApply.js";
import { glyph } from "./dockIcon.js";
import { DOCK_CLOSING_ATTR, DOCK_OPEN_ATTR } from "./dockState.js";
import {
  MENU_SECTIONS,
  OTHER_CATEGORY,
  SECTION_CATEGORIES,
  extraSections
} from "./sideMenuSections.js";

export const PANEL_ID = "pesu-max-all-sections";
export const SCRIM_ID = "pesu-max-dock-scrim";

const ENTRY_CLASS = "pesu-max-dock-entry";
const ACTIVE_ATTR = "data-pesu-max-active";
const CLOSE_MS = 160;

const groupsFor = (available) => [
  ...SECTION_CATEGORIES.map((category) => ({
    category,
    sections: MENU_SECTIONS.filter(
      (section) => section.category === category && available.has(section.id)
    )
  })),
  {
    category: OTHER_CATEGORY,
    sections: extraSections(available).map((id) => ({
      id,
      label: available.get(id),
      category: OTHER_CATEGORY
    }))
  }
].filter((group) => group.sections.length > 0);

function entry(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ENTRY_CLASS;
  button.dataset.pesuMaxSection = item.id;
  button.dataset.pesuMaxSearch = `${item.label} ${item.category}`.toLowerCase();

  const tile = document.createElement("span");
  tile.className = "pesu-max-dock-tile";
  tile.appendChild(glyph(MENU_ICON_BY_ID[item.id] || "Menu"));

  const label = document.createElement("span");
  label.className = "pesu-max-dock-entry-label";
  label.textContent = item.label;

  button.append(tile, label);
  return button;
}

// All sections panel
export function buildAllSectionsPanel({ available, trigger, onSelect }) {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.hidden = true;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "All sections");

  const head = document.createElement("div");
  head.className = "pesu-max-dock-panel-head";
  const title = document.createElement("h2");
  title.textContent = "All sections";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "pesu-max-dock-close";
  closeButton.setAttribute("aria-label", "Close all sections");
  closeButton.appendChild(glyph("Close"));
  head.append(title, closeButton);

  const field = document.createElement("div");
  field.className = "pesu-max-dock-field";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Find a section, e.g. fees or hall ticket";
  input.setAttribute("aria-label", "Find a section");
  field.append(glyph("Search"), input);

  const body = document.createElement("div");
  body.className = "pesu-max-dock-body";
  const entries = new Map();

  groupsFor(available).forEach((group) => {
    const section = document.createElement("section");
    section.className = "pesu-max-dock-group";
    const heading = document.createElement("h3");
    heading.textContent = group.category;
    const list = document.createElement("div");
    list.className = "pesu-max-dock-list";

    group.sections.forEach((item) => {
      const button = entry(item);
      entries.set(item.id, button);
      list.appendChild(button);
    });

    section.append(heading, list);
    body.appendChild(section);
  });

  const empty = document.createElement("p");
  empty.className = "pesu-max-dock-empty";
  empty.setAttribute("role", "status");
  empty.textContent = "No section matches that search.";
  empty.hidden = true;
  body.appendChild(empty);

  panel.append(head, field, body);

  const scrim = document.createElement("div");
  scrim.id = SCRIM_ID;
  scrim.hidden = true;

  let closing = 0;

  const applyFilter = () => {
    const needle = input.value.trim().toLowerCase();
    let shown = 0;

    entries.forEach((button) => {
      const match = !needle || button.dataset.pesuMaxSearch.includes(needle);
      button.hidden = !match;
      if (match) shown += 1;
    });

    panel.querySelectorAll(".pesu-max-dock-group").forEach((group) => {
      group.hidden = ![...group.querySelectorAll(`.${ENTRY_CLASS}`)].some((item) => !item.hidden);
    });

    empty.hidden = shown > 0;
  };

  const open = () => {
    window.clearTimeout(closing);
    closing = 0;
    panel.removeAttribute(DOCK_CLOSING_ATTR);
    scrim.removeAttribute(DOCK_CLOSING_ATTR);
    panel.hidden = false;
    scrim.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute(DOCK_OPEN_ATTR, "");
    input.value = "";
    applyFilter();
    input.focus();
    const active = panel.querySelector(`.${ENTRY_CLASS}[${ACTIVE_ATTR}]`);
    if (active) active.scrollIntoView({ block: "nearest" });
  };

  const hideNow = () => {
    window.clearTimeout(closing);
    closing = 0;
    panel.removeAttribute(DOCK_CLOSING_ATTR);
    scrim.removeAttribute(DOCK_CLOSING_ATTR);
    panel.hidden = true;
    scrim.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute(DOCK_OPEN_ATTR);
  };

  const close = () => {
    if (panel.hidden || closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hideNow();
      return;
    }
    panel.setAttribute(DOCK_CLOSING_ATTR, "");
    scrim.setAttribute(DOCK_CLOSING_ATTR, "");
    closing = window.setTimeout(hideNow, CLOSE_MS);
  };

  const setActive = (id) => {
    entries.forEach((button, key) => {
      if (key === id) button.setAttribute(ACTIVE_ATTR, "");
      else button.removeAttribute(ACTIVE_ATTR);
    });
  };

  panel.addEventListener("click", (event) => {
    const item = event.target.closest(`.${ENTRY_CLASS}`);
    if (item) {
      onSelect(item.dataset.pesuMaxSection);
      return;
    }
    if (event.target.closest(".pesu-max-dock-close")) close();
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
    trigger.focus();
  });

  input.addEventListener("input", applyFilter);
  scrim.addEventListener("click", close);

  return {
    element: panel,
    scrim,
    open,
    close,
    toggle: () => (panel.hidden ? open() : close()),
    setActive,
    destroy: () => {
      hideNow();
      panel.remove();
      scrim.remove();
    }
  };
}
