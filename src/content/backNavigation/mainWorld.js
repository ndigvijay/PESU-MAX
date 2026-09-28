import { MENU_LIST_ID, SIDE_MENU_CONTENT_SELECTOR } from "../academyPage.js";
import { createHistoryStack } from "./historyStack.js";
import { createRecorder } from "./stepRecorder.js";

const INSTALLED_ATTR = "data-pesu-max-back-nav";

function install() {
  const root = document.documentElement;
  const $ = window.jQuery;
  const content = document.querySelector(SIDE_MENU_CONTENT_SELECTOR);
  if (root.hasAttribute(INSTALLED_ATTR) || !$ || !content) return false;
  root.setAttribute(INSTALLED_ATTR, "");

  const stack = createHistoryStack($);
  const recorder = createRecorder($, content, document.getElementById(MENU_LIST_ID), stack);
  stack.start(recorder);
  return true;
}

function installWhenReady() {
  if (install()) return;
  window.addEventListener("load", install, { once: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installWhenReady, { once: true });
} else {
  installWhenReady();
}
