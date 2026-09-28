import { MENU_ITEM_ID_PREFIX, MENU_LIST_ID } from "../academyPage.js";
import { ENTRY_GUARD, ENTRY_VIEW, MAX_KEPT_STEPS, STATE_KEY } from "./backNavigation.js";
import { revert } from "./stepRecorder.js";
import { replay } from "./stepReplay.js";

let idCounter = 0;
const newId = () => `${Date.now().toString(36)}-${(idCounter += 1).toString(36)}`;
const entryOf = (state) => (state && typeof state === "object" && state[STATE_KEY]) || null;

function replaceEntry(entry) {
  const base = history.state && typeof history.state === "object" ? history.state : {};
  history.replaceState(Object.assign({}, base, { [STATE_KEY]: entry }), "");
}

const menuAction = (menuId) => ({
  kind: "click",
  selector: `#${menuId} > a`,
  label: menuId,
  menu: menuId
});

export function createHistoryStack($) {
  const logs = new Map();
  const ids = [];
  let recorder = null;
  let current = null;
  let rootMenu = null;
  let busy = false;
  let pending = false;

  function releaseLog(id) {
    const log = logs.get(id);
    if (!log) return;
    recorder.release(log.records);
    logs.delete(id);
  }

  function clearLogs() {
    [...logs.keys()].forEach(releaseLog);
  }

  function dropFrom(index) {
    [...logs.entries()].forEach(([id, log]) => {
      if (log.index >= index) releaseLog(id);
    });
  }

  function onStep(records, action, base) {
    const fromRoot = !current.steps.length;
    if (fromRoot && !rootMenu) rootMenu = base;
    const entry = {
      kind: ENTRY_VIEW,
      id: newId(),
      index: current.index + 1,
      steps: (action.menu ? [action] : current.steps.concat([action])).slice(-MAX_KEPT_STEPS),
      base: action.menu ? null : fromRoot ? base : current.base
    };
    dropFrom(entry.index);
    logs.set(entry.id, { index: entry.index, records, atEntry: true });
    ids.length = entry.index;
    ids[entry.index] = entry.id;
    history.pushState({ [STATE_KEY]: entry }, "");
    current = entry;
    while (logs.size > MAX_KEPT_STEPS) releaseLog(logs.keys().next().value);
  }

  function walkLogs(target) {
    let index = current.index;
    while (index !== target.index) {
      const forward = target.index > index;
      const entryIndex = forward ? index + 1 : index;
      const log = logs.get(ids[entryIndex]);
      if (!log || log.atEntry === forward) return false;
      const { records, error } = recorder.capture(() => revert(log.records));
      if (error) return false;
      log.records = records;
      log.atEntry = forward;
      index = forward ? index + 1 : index - 1;
    }
    return true;
  }

  async function rebuild(target) {
    clearLogs();
    const chain = target.steps.slice();
    if (!chain.length || !chain[0].menu) {
      const firstMenu = document.querySelector(`#${MENU_LIST_ID} li[id^="${MENU_ITEM_ID_PREFIX}"]`);
      const menuId = target.base || rootMenu || (firstMenu && firstMenu.id);
      if (menuId) chain.unshift(menuAction(menuId));
    }
    await replay($, recorder, chain);
  }

  async function moveTo(target) {
    busy = true;
    try {
      await recorder.cancelStep();
      if (!walkLogs(target)) await rebuild(target);
      current = target;
      ids[target.index] = target.id;
    } finally {
      busy = false;
    }
    if (pending) {
      pending = false;
      const latest = entryOf(history.state);
      if (latest && latest.kind === ENTRY_VIEW && latest.id !== current.id) void moveTo(latest);
    }
  }

  function onPopState(event) {
    const target = entryOf(event.state);
    if (!target) return;
    if (target.kind === ENTRY_GUARD) {
      history.forward();
      return;
    }
    if (busy) {
      pending = true;
      return;
    }
    if (target.id !== current.id) void moveTo(target);
  }

  function start(attachedRecorder) {
    recorder = attachedRecorder;
    const existing = entryOf(history.state);
    if (existing && existing.kind === ENTRY_VIEW) {
      current = { kind: ENTRY_VIEW, id: newId(), index: existing.index, steps: [], base: null };
      replaceEntry(current);
    } else {
      if (!existing) replaceEntry({ kind: ENTRY_GUARD, id: newId(), index: -1 });
      current = { kind: ENTRY_VIEW, id: newId(), index: 0, steps: [], base: null };
      history.pushState({ [STATE_KEY]: current }, "");
    }
    ids[current.index] = current.id;
    window.addEventListener("popstate", onPopState);
  }

  return { start, onStep, isBusy: () => busy };
}
