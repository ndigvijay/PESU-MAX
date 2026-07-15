(() => {
  if (window.__pesuMaxNavigationObserver) {
    return;
  }
  window.__pesuMaxNavigationObserver = true;

  const EVENT_NAME = "pesu-max-navigation";
  const SETTLE_DELAY_MS = 450;
  const REPLAY_TIMEOUT_MS = 7000;
  let pendingAction = null;
  let settleTimer = null;
  let mutationVersion = 0;
  let replaying = false;

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, ...detail } }));
  }

  function isPortalControl(element) {
    return Boolean(element?.closest("#studentProfilePESUHomeMenu, #StudentProfilePESUContent"));
  }

  function isLogoutControl(element) {
    const link = element?.closest("a");
    return link?.getAttribute("href")?.includes("/Academy/logout");
  }

  function selectorFor(element) {
    if (!element) {
      return null;
    }

    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }

      const siblings = [...current.parentElement?.children || []]
        .filter((sibling) => sibling.tagName === current.tagName);
      const index = siblings.indexOf(current) + 1;
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
      current = current.parentElement;
    }

    return parts.length ? parts.join(" > ") : null;
  }

  function pathFromCurrentState() {
    const state = history.state?.pesuMaxNavigation;
    return Array.isArray(state?.path) ? state.path : [];
  }

  function currentEntryId() {
    return history.state?.pesuMaxNavigation?.id || null;
  }

  function isTopLevelMenu(element) {
    return Boolean(element?.closest("#studentProfilePESUHomeMenu > li[data-url]"));
  }

  function isUnsafeControl(element) {
    if (element.matches("button[type='submit'], input[type='submit']")) {
      return true;
    }

    const label = `${element.id} ${element.name} ${element.textContent}`.toLowerCase();
    return /\b(save|submit|delete|remove|pay|payment|register|enroll|withdraw|cancel)\b/.test(label);
  }

  function queueAction(action) {
    if (replaying || !action?.selector) {
      return;
    }

    pendingAction = { action, sawMutation: false };
    window.clearTimeout(settleTimer);
  }

  function scheduleCommit() {
    if (!pendingAction || replaying) {
      return;
    }

    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(commitPendingAction, SETTLE_DELAY_MS);
  }

  function commitPendingAction() {
    if (!pendingAction?.sawMutation || replaying) {
      pendingAction = null;
      return;
    }

    const path = pendingAction.action.topLevel
      ? [pendingAction.action]
      : [...pathFromCurrentState(), pendingAction.action];
    const entry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      parentId: currentEntryId(),
      path
    };

    history.pushState({ pesuMaxNavigation: entry }, "", location.href);
    emit("record", { entry });
    pendingAction = null;
  }

  function handleClick(event) {
    if (!event.isTrusted) {
      return;
    }

    const element = event.target?.closest("a, button, tr, [role='button'], input[type='button']");
    if (!element) {
      return;
    }

    if (isLogoutControl(element)) {
      emit("logout");
      return;
    }

    if (!isPortalControl(element) || isUnsafeControl(element)) {
      return;
    }

    const href = element.getAttribute("href") || "";
    if (/^(https?:|mailto:|tel:)/i.test(href) || element.hasAttribute("download")) {
      return;
    }

    // Course rows only react when the original click target is a table cell.
    const actionElement = element.matches("tr") ? event.target.closest("td") || element : element;
    queueAction({
      type: "click",
      selector: selectorFor(actionElement),
      topLevel: isTopLevelMenu(element)
    });
  }

  function handleChange(event) {
    if (!event.isTrusted) {
      return;
    }

    const element = event.target;
    if (!(element instanceof HTMLSelectElement) || !isPortalControl(element)) {
      return;
    }

    queueAction({ type: "change", selector: selectorFor(element), value: element.value });
  }

  function observeContent() {
    const root = document.documentElement;
    new MutationObserver((records) => {
      mutationVersion += records.length;
      if (!pendingAction) {
        return;
      }

      if (records.some((record) => isPortalControl(record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement))) {
        pendingAction.sawMutation = true;
        scheduleCommit();
      }
    }).observe(root, { childList: true, subtree: true });
  }

  function waitForMutation(version) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (mutationVersion > version || Date.now() - startedAt > REPLAY_TIMEOUT_MS) {
          window.clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  }

  async function replayPath(path) {
    if (!Array.isArray(path) || !path.length) {
      return;
    }

    replaying = true;
    try {
      for (const action of path) {
        const element = document.querySelector(action.selector);
        if (!element) {
          throw new Error(`Unable to restore ${action.selector}`);
        }

        const version = mutationVersion;
        if (action.type === "change" && element instanceof HTMLSelectElement) {
          element.value = action.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (action.type === "click") {
          element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        } else {
          throw new Error("Unsupported navigation action");
        }

        await waitForMutation(version);
      }
    } catch (error) {
      console.warn("[PESU-MAX] Could not restore navigation state", error);
    } finally {
      replaying = false;
    }
  }

  window.addEventListener("popstate", (event) => {
    const entry = event.state?.pesuMaxNavigation;
    if (!entry?.id || !entry.path) {
      return;
    }

    emit("activate", { entryId: entry.id });
    replayPath(entry.path);
  });

  window.addEventListener("pesu-max-restore-navigation", (event) => {
    replayPath(event.detail?.path);
  });

  function initializeDashboardRoute() {
    if (history.state?.pesuMaxNavigation || !document.querySelector("#studentProfilePESUHomeMenu")) {
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      parentId: null,
      base: true,
      path: [{ type: "click", selector: "#menuTab_651", topLevel: true }]
    };
    history.replaceState({ pesuMaxNavigation: entry }, "", location.href);
    emit("record", { entry });
  }

  window.addEventListener("pageshow", () => {
    initializeDashboardRoute();
    const rootPath = location.pathname.replace(/\/+$/, "");
    const isLoginPage = (rootPath === "/Academy" || rootPath === "") && Boolean(document.querySelector("#passwordField"));
    if (isLoginPage) {
      emit("recover-login");
    }
  });

  document.addEventListener("click", handleClick, true);
  document.addEventListener("change", handleChange, true);
  observeContent();
  document.addEventListener("DOMContentLoaded", initializeDashboardRoute, { once: true });
})();
