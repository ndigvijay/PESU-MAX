import { MENU_ITEM_ID_PREFIX, MENU_LIST_ID } from "../academyPage.js";
import { PESU_MAX_ROOT_ID, SETTLE_MS, STEP_TIMEOUT_MS } from "./backNavigation.js";

const WATCH_CONTENT = {
  subtree: true,
  childList: true,
  attributes: true,
  attributeOldValue: true,
  characterData: true,
  characterDataOldValue: true
};
const WATCH_MENU = { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true };
const POLL_MS = 100;

const uniqueId = (el) => el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1;

export function cssPath(el) {
  if (uniqueId(el)) return `#${CSS.escape(el.id)}`;
  const parts = [];
  for (let node = el; node && node.nodeType === 1 && node !== document.body; node = node.parentElement) {
    if (uniqueId(node)) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    let position = 1;
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.tagName === node.tagName) position += 1;
    }
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${position})`);
  }
  return parts.join(" > ");
}

const labelOf = (el) =>
  (el.innerText || el.value || el.title || el.getAttribute("aria-label") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

function clickAction(target) {
  const menuItem = target.closest(`#${MENU_LIST_ID} li[id^="${MENU_ITEM_ID_PREFIX}"]`);
  const actionable = target.closest("a, button, [onclick]") || target;
  return {
    kind: "click",
    selector: cssPath(target),
    label: labelOf(actionable),
    menu: menuItem ? menuItem.id : null
  };
}

function selectAction(select) {
  const option = select.options[select.selectedIndex];
  return {
    kind: "select",
    selector: cssPath(select),
    value: select.value,
    label: `${select.name || select.id}=${option ? option.text.trim() : select.value}`,
    menu: null
  };
}

const CONTROL_SELECTOR = "select, input[type=\"checkbox\"], input[type=\"radio\"]";

function controlGroup(control) {
  if (control.type !== "radio" || !control.name) return [control];
  const scope = control.form || document;
  return [...scope.querySelectorAll(`input[type="radio"][name="${CSS.escape(control.name)}"]`)];
}

const readControl = (control) =>
  controlGroup(control).map((target) => {
    const name = target.tagName === "SELECT" ? "value" : "checked";
    return { type: "property", target, name, oldValue: target[name] };
  });

const insideAddedContent = new WeakSet();

export function revert(records) {
  const redo = [];
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (insideAddedContent.has(record)) continue;
    if (record.type === "property") {
      redo.push({ type: "property", target: record.target, name: record.name, oldValue: record.target[record.name] });
      record.target[record.name] = record.oldValue;
    } else if (record.type === "attributes") {
      if (record.oldValue === null) record.target.removeAttribute(record.attributeName);
      else record.target.setAttribute(record.attributeName, record.oldValue);
    } else if (record.type === "characterData") {
      record.target.data = record.oldValue;
    } else {
      for (const node of record.addedNodes) {
        if (node.parentNode !== record.target) throw new Error("stale step");
        record.target.removeChild(node);
      }
      const before = record.nextSibling;
      if (before && before.parentNode !== record.target) throw new Error("stale step");
      for (const node of record.removedNodes) record.target.insertBefore(node, before);
    }
  }
  return redo;
}

export function createRecorder($, contentRoot, menuList, stack) {
  const originalCleanData = $.cleanData;
  const observer = new MutationObserver((records) => accept(records));
  const controlState = new WeakMap();
  let open = null;
  let timer = null;
  let lastChange = Date.now();

  const inWatchedArea = (node) =>
    Boolean(node) && (contentRoot.contains(node) || Boolean(menuList && menuList.contains(node)));

  const relevant = (records) =>
    records.filter((record) =>
      !(record.type === "attributes" && (record.target === contentRoot || record.target === menuList))
    );

  function track(step, record) {
    if (step.added.some((node) => node.contains(record.target))) insideAddedContent.add(record);
    if (record.type !== "childList") return;
    record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) step.added.push(node);
    });
  }

  function accept(records) {
    const kept = relevant(records);
    if (!kept.length) return;
    lastChange = Date.now();
    if (!open) return;
    kept.forEach((record) => track(open, record));
    open.records.push(...kept);
  }

  function closeStep(carryFormChanges) {
    clearTimeout(timer);
    if (!open || open.cancelled) return [];
    accept(observer.takeRecords());
    const step = open;
    open = null;
    if (step.records.some((record) => record.type !== "property")) {
      stack.onStep(step.records, step.action, step.base);
      return [];
    }
    return carryFormChanges ? step.records : [];
  }

  function rememberControl(event) {
    const control = event.target instanceof Element ? event.target.closest(CONTROL_SELECTOR) : null;
    if (control) controlState.set(control, readControl(control));
  }

  function controlChanges(target) {
    const control = target.closest(CONTROL_SELECTOR);
    if (!control) return [];
    const before = controlState.get(control) || [];
    controlState.set(control, readControl(control));
    return before.filter((record) => record.target[record.name] !== record.oldValue);
  }

  function check() {
    if (!open || open.cancelled) return;
    const now = Date.now();
    const quiet = now - lastChange >= SETTLE_MS && !$.active;
    if (quiet || now - open.started > STEP_TIMEOUT_MS) closeStep();
    else timer = setTimeout(check, POLL_MS);
  }

  function openStep(action, formChanges) {
    const carried = closeStep(true);
    const active = menuList && menuList.querySelector(`li.active[id^="${MENU_ITEM_ID_PREFIX}"]`);
    open = {
      records: carried.concat(formChanges),
      added: [],
      action,
      base: active ? active.id : null,
      started: Date.now()
    };
    lastChange = Date.now();
    timer = setTimeout(check, POLL_MS);
  }

  function onUserEvent(event) {
    if (!event.isTrusted || stack.isBusy()) return;
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    if (!target || target.closest(`#${PESU_MAX_ROOT_ID}`)) return;
    if (event.type === "change") {
      if (target.tagName === "SELECT") openStep(selectAction(target), controlChanges(target));
      return;
    }
    openStep(clickAction(target), controlChanges(target));
  }

  function onAnyClick(event) {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (link && link.getAttribute("href") === "#" && !link.closest(`#${PESU_MAX_ROOT_ID}`)) {
      event.preventDefault();
    }
  }

  $.cleanData = function (elems) {
    if (open && elems && elems.length && inWatchedArea(elems[0])) return undefined;
    return originalCleanData.apply(this, arguments);
  };

  function idle() {
    return new Promise((resolve) => {
      const started = Date.now();
      const poll = () => {
        const now = Date.now();
        if ((now - lastChange >= SETTLE_MS && !$.active) || now - started > STEP_TIMEOUT_MS) resolve();
        else setTimeout(poll, POLL_MS);
      };
      setTimeout(poll, POLL_MS);
    });
  }

  function capture(change) {
    accept(observer.takeRecords());
    let error = null;
    let formChanges = [];
    try {
      formChanges = change() || [];
    } catch (caught) {
      error = caught;
    }
    const records = relevant(observer.takeRecords()).concat(formChanges);
    lastChange = Date.now();
    return { records, error };
  }

  const hasPendingStep = () =>
    Boolean(open) && !open.cancelled && open.records.some((record) => record.type !== "property");

  async function cancelStep() {
    const step = open;
    if (!step) return;
    step.cancelled = true;
    clearTimeout(timer);
    await idle();
    accept(observer.takeRecords());
    if (open === step) open = null;
    capture(() => revert(step.records));
  }

  function release(records) {
    const elems = [];
    records.forEach((record) => {
      [...(record.removedNodes || []), ...(record.addedNodes || [])].forEach((node) => {
        if (node.nodeType === 1 && !document.contains(node)) elems.push(node, ...node.getElementsByTagName("*"));
      });
    });
    if (elems.length) originalCleanData.call($, elems);
  }

  observer.observe(contentRoot, WATCH_CONTENT);
  if (menuList) observer.observe(menuList, WATCH_MENU);
  ["mousedown", "keydown", "focusin"].forEach((type) => document.addEventListener(type, rememberControl, true));
  document.addEventListener("click", onAnyClick, true);
  document.addEventListener("click", onUserEvent, true);
  document.addEventListener("change", onUserEvent, true);

  return { capture, cancelStep, hasPendingStep, idle, release };
}
