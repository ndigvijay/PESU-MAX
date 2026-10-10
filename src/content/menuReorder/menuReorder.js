import { load, save } from "../../utils/storage.js";
import { SIDE_MENU_ORDER_KEY } from "../../utils/storageKeys.js";
import { MENU_LIST_ID, isHome, menuItems } from "../academyPage.js";
import { isDockOn } from "../sideMenuDock/sideMenuDock.js";
import { buildEditBar, setEditBarBusy, setEditBarMessage } from "./menuReorderBar.js";
import { enableReordering, makeDraggable } from "./menuReorderDrag.js";
import { BAR_ID, EDITING, injectStyle } from "./menuReorderStyle.js";

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

const menuList = () => document.getElementById(MENU_LIST_ID);

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
  if (wanted.length === current.length && wanted.every((id, index) => id === current[index])) {
    return;
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  wanted.forEach((id) => list.appendChild(byId.get(id)));
}

function reorderDom(list, ids) {
  const byId = new Map(menuItems(list).map((item) => [item.id, item]));
  ids.forEach((id) => {
    if (byId.has(id)) list.appendChild(byId.get(id));
  });
}

function rememberOrder(list) {
  savedOrder = menuItems(list).map((item) => item.id);
}

function persist(order) {
  return Promise.resolve().then(() => save(SIDE_MENU_ORDER_KEY, order));
}

function sync() {
  const list = menuList();
  if (!list) {
    updateState();
    return;
  }

  if (isDockOn()) {
    if (editing) exitMenuEdit();
    else updateState();
    return;
  }

  if (!wiredLists.has(list)) {
    wiredLists.add(list);
    naturalOrders.set(list, []);
    injectStyle();
    enableReordering(list, () => editing);
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
    buildEditBar({ onReset: resetMenuOrder, onLock: lockMenuOrder });
  }

  makeDraggable(list, () => editing);
  if (!editing) applyOrder(list);
  updateState();
}

export function canEditMenu() {
  const list = menuList();
  return !isDockOn() && !!list && menuItems(list).length > 0;
}

export function isMenuEditActive() {
  return editing;
}

export function startMenuEdit() {
  const list = menuList();
  if (!list || !menuItems(list).length || isDockOn()) return false;
  editing = true;
  list.classList.add(EDITING);
  buildEditBar({ onReset: resetMenuOrder, onLock: lockMenuOrder });
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
