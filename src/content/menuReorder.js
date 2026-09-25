import { load, save } from "../utils/storage.js";
import { SIDE_MENU_ORDER_KEY } from "../utils/storageKeys.js";
import {
  ACADEMY_HOME_URL_MARKER,
  MENU_ITEM_ID_PREFIX,
  MENU_LIST_ID,
  MENU_URL_ATTR
} from "./academyPage.js";
import theme from "../../frontend/Themes/theme.jsx";

const STYLE_ID = "pesu-max-menu-reorder-style";
const BAR_ID = "pesu-max-menu-edit-bar";
const CLASS = "pesu-max-menu";
const EDITING = `${CLASS}-editing`;
const HOME_LOCKED = `${CLASS}-home-locked`;
const DRAGGING = `${CLASS}-dragging`;
const DROP_ABOVE = `${CLASS}-drop-above`;
const DROP_BELOW = `${CLASS}-drop-below`;

const MENU_REVEAL_FAILSAFE_MS = 1000;

let savedOrder = [];
let editing = false;
const wiredLists = new WeakSet();
const naturalOrders = new WeakMap();
const stateListeners = new Set();
let stateSnapshot = {
  canReorder: false,
  isEditing: false,
};

const menuItems = (list) =>
  [...list.children].filter((el) => el.tagName === "LI" && el.id.startsWith(MENU_ITEM_ID_PREFIX));

const menuList = () => document.getElementById(MENU_LIST_ID);

// Home stays pinned first.
const isHome = (item) =>
  !!item && (item.getAttribute(MENU_URL_ATTR) || "").includes(ACADEMY_HOME_URL_MARKER);

function updateState() {
  const nextSnapshot = {
    canReorder: canEditMenu(),
    isEditing: editing,
  };
  if (
    nextSnapshot.canReorder === stateSnapshot.canReorder &&
    nextSnapshot.isEditing === stateSnapshot.isEditing
  ) {
    return;
  }
  stateSnapshot = nextSnapshot;
  stateListeners.forEach((listener) => listener());
}

export function subscribeToMenuReorder(listener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function getMenuReorderSnapshot() {
  return stateSnapshot;
}

function computeOrder(itemIds, order, homeId) {
  const present = new Set(itemIds);
  const wanted = [];
  const seen = new Set();

  const push = (id) => {
    if (present.has(id) && !seen.has(id)) {
      wanted.push(id);
      seen.add(id);
    }
  };

  if (homeId) push(homeId);
  (order || []).forEach(push);
  itemIds.forEach(push);

  return wanted;
}

function applyOrder(list) {
  const items = menuItems(list);
  if (!items.length) return;

  const current = items.map((item) => item.id);
  const home = items.find(isHome);
  const wanted = computeOrder(current, savedOrder, home ? home.id : null);
  if (wanted.length === current.length && wanted.every((id, index) => id === current[index])) return;

  const byId = new Map(items.map((item) => [item.id, item]));
  wanted.forEach((id) => list.appendChild(byId.get(id)));
}

function reorderDom(list, ids) {
  const byId = new Map(menuItems(list).map((item) => [item.id, item]));
  ids.forEach((id) => {
    if (byId.has(id)) list.appendChild(byId.get(id));
  });
}

function makeDraggable(list) {
  menuItems(list).forEach((item) => {
    const home = isHome(item);
    item.draggable = editing && !home;
    item.classList.toggle(HOME_LOCKED, editing && home);
    const link = item.querySelector("a");
    if (link) link.draggable = false;
  });
}

function rememberOrder(list) {
  savedOrder = menuItems(list).map((item) => item.id);
}

function persist(order) {
  return Promise.resolve().then(() => save(SIDE_MENU_ORDER_KEY, order));
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${MENU_LIST_ID}.${EDITING} {
      outline: 2px dashed ${theme.colors.primary};
      outline-offset: -2px;
      border-radius: 8px;
    }
    #${MENU_LIST_ID}.${EDITING} > li[id^="${MENU_ITEM_ID_PREFIX}"] { cursor: grab; }
    #${MENU_LIST_ID} > li.${HOME_LOCKED} { cursor: not-allowed; opacity: 0.65; }
    #${MENU_LIST_ID} > li.${DRAGGING} { cursor: grabbing; opacity: 0.5; }
    #${MENU_LIST_ID} > li.${DROP_ABOVE} { box-shadow: inset 0 3px 0 0 ${theme.colors.secondary}; }
    #${MENU_LIST_ID} > li.${DROP_BELOW} { box-shadow: inset 0 -3px 0 0 ${theme.colors.secondary}; }
    #${BAR_ID} {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 520px;
      padding: 12px 14px;
      box-sizing: border-box;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #${BAR_ID} .${CLASS}-text { display: flex; flex-direction: column; gap: 2px; }
    #${BAR_ID} .${CLASS}-title { font-size: 14px; font-weight: 700; color: ${theme.colors.secondary}; }
    #${BAR_ID} .${CLASS}-hint { font-size: 12px; color: #666666; }
    #${BAR_ID} button {
      flex: 0 0 auto;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1.5px solid ${theme.colors.secondary};
      background: #ffffff;
      color: ${theme.colors.secondary};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    #${BAR_ID} button.${CLASS}-lock {
      border-color: ${theme.colors.primary};
      background: ${theme.colors.primary};
      color: #ffffff;
    }
    #${BAR_ID} button.${CLASS}-lock:hover { background: ${theme.colors.primaryHover}; }
    #${BAR_ID} button.${CLASS}-reset:hover { background: ${theme.colors.secondaryLight}; }
  `;
  document.head.appendChild(style);
}

function buildEditBar() {
  if (document.getElementById(BAR_ID)) return;
  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.innerHTML = `
    <span class="${CLASS}-text">
      <span class="${CLASS}-title">Re-order side menu</span>
      <span class="${CLASS}-hint">Drag a section into place, then lock the order in. Home stays first.</span>
    </span>
    <button type="button" class="${CLASS}-reset">Reset</button>
    <button type="button" class="${CLASS}-lock">&#10003;&nbsp; Lock order</button>
  `;
  bar.querySelector(`.${CLASS}-reset`).addEventListener("click", resetMenuOrder);
  bar.querySelector(`.${CLASS}-lock`).addEventListener("click", lockMenuOrder);
  document.body.appendChild(bar);
}

function setEditBarMessage(message, isError = false) {
  const hint = document.querySelector(`#${BAR_ID} .${CLASS}-hint`);
  if (!hint) return;
  hint.textContent = message;
  hint.style.color = isError ? "#d32f2f" : "#666666";
}

function setEditBarBusy(busy) {
  const bar = document.getElementById(BAR_ID);
  if (!bar) return;
  const buttons = bar.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = busy;
  });
  const lockButton = bar.querySelector(`.${CLASS}-lock`);
  if (lockButton) lockButton.textContent = busy ? "Saving..." : "✓  Lock order";
}

function enableReordering(list) {
  let dragged = null;

  const clearMarks = () =>
    menuItems(list).forEach((item) => item.classList.remove(DROP_ABOVE, DROP_BELOW));
  const mark = (item, above) => {
    clearMarks();
    item.classList.add(above ? DROP_ABOVE : DROP_BELOW);
  };
  const targetItem = (event) => {
    const item = event.target.closest("li");
    return item && list.contains(item) ? item : null;
  };

  list.addEventListener("dragstart", (event) => {
    const item = targetItem(event);
    if (!editing || !item || isHome(item)) return event.preventDefault();
    dragged = item;
    item.classList.add(DRAGGING);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
  });

  list.addEventListener("dragover", (event) => {
    const item = targetItem(event);
    if (!dragged || !item || item === dragged) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (isHome(item)) return mark(item, false);
    const box = item.getBoundingClientRect();
    mark(item, event.clientY < box.top + box.height / 2);
  });

  list.addEventListener("drop", (event) => {
    const item = targetItem(event);
    if (!dragged || !item || item === dragged) return;
    event.preventDefault();
    if (isHome(item) || !item.classList.contains(DROP_ABOVE)) item.after(dragged);
    else item.before(dragged);
    clearMarks();
  });

  list.addEventListener("dragend", () => {
    if (!dragged) return;
    dragged.classList.remove(DRAGGING);
    dragged = null;
    clearMarks();
  });
}

function sync() {
  const list = menuList();
  if (!list) {
    updateState();
    return;
  }

  if (!wiredLists.has(list)) {
    wiredLists.add(list);
    naturalOrders.set(list, []);
    injectStyle();
    enableReordering(list);
  }

  const naturalOrder = naturalOrders.get(list);
  const knownIds = new Set(naturalOrder);
  menuItems(list).forEach((item) => {
    if (!knownIds.has(item.id)) {
      naturalOrder.push(item.id);
      knownIds.add(item.id);
    }
  });

  if (editing) {
    list.classList.add(EDITING);
    buildEditBar();
  }

  makeDraggable(list);
  if (!editing) applyOrder(list);
  updateState();
}

export function canEditMenu() {
  const list = menuList();
  return !!list && menuItems(list).length > 0;
}

export function isMenuEditActive() {
  return editing;
}

export function startMenuEdit() {
  const list = menuList();
  if (!list || !menuItems(list).length) return false;
  editing = true;
  list.classList.add(EDITING);
  buildEditBar();
  sync();
  return true;
}

function exitMenuEdit() {
  editing = false;
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.remove();
  const list = menuList();
  if (list) list.classList.remove(EDITING);
  sync();
}

export function resetMenuOrder() {
  const list = menuList();
  if (!list) return;
  reorderDom(list, naturalOrders.get(list) || []);
  setEditBarMessage("Default menu order restored. Lock the order to save it.");
}

export async function lockMenuOrder() {
  const list = menuList();
  if (!list) return false;

  rememberOrder(list);
  setEditBarBusy(true);
  setEditBarMessage("Saving menu order...");
  try {
    await persist(savedOrder);
    exitMenuEdit();
    return true;
  } catch {
    setEditBarBusy(false);
    setEditBarMessage("Could not save the order. Try again or reload the extension.", true);
    return false;
  }
}

export function initMenuReorder() {
  const list = menuList();
  const reveal = () => {
    if (list) list.style.visibility = "";
  };
  if (list) list.style.visibility = "hidden";

  const failsafe = setTimeout(reveal, MENU_REVEAL_FAILSAFE_MS);

  new MutationObserver(sync).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  sync();
  load(SIDE_MENU_ORDER_KEY)
    .then((order) => {
      savedOrder = order || [];
      sync();
    })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(failsafe);
      reveal();
    });
}
