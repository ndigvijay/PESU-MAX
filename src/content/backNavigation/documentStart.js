import { load } from "../../utils/storage.js";
import { BACK_NAVIGATION_KEY } from "../../utils/storageKeys.js";
import { ACADEMY_BASE_URL, ACADEMY_PROFILE_PATH } from "../../helpers/academyAuth.js";
import { probeSession } from "../../services/academySession.js";
import { ACADEMY_APP_PATH_PREFIX, hasLoginForm, loginFormEngaged } from "../academyPage.js";

const LOGIN_PATHS = ["/Academy", "/Academy/"];

function injectMainWorld() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("content/backNavigationMain.js");
  script.async = false;
  script.onload = script.onerror = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

const reachedByBackForward = () => {
  const entry = performance.getEntriesByType("navigation")[0];
  return Boolean(entry) && entry.type === "back_forward";
};

async function leaveStaleLoginPage() {
  if (!hasLoginForm() || loginFormEngaged()) return;
  const alive = await probeSession().catch(() => null);
  if (alive === true && hasLoginForm() && !loginFormEngaged()) {
    location.replace(`${ACADEMY_BASE_URL}${ACADEMY_PROFILE_PATH}`);
  }
}

function watchLoginPage() {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void leaveStaleLoginPage();
  });
  if (!reachedByBackForward()) return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void leaveStaleLoginPage(), { once: true });
  } else {
    void leaveStaleLoginPage();
  }
}

load(BACK_NAVIGATION_KEY)
  .then((enabled) => {
    if (enabled !== true) return;
    if (location.pathname.startsWith(ACADEMY_APP_PATH_PREFIX)) injectMainWorld();
    else if (LOGIN_PATHS.includes(location.pathname)) watchLoginPage();
  })
  .catch(() => {});
