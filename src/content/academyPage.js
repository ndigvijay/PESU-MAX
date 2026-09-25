export const MENU_LIST_ID = "studentProfilePESUHomeMenu";
export const MENU_ITEM_ID_PREFIX = "menuTab_";
export const MENU_URL_ATTR = "data-url";
export const SIDE_MENU_SELECTOR = ".menu-left";
export const SIDE_MENU_CONTENT_SELECTOR = ".content-right";
export const SIDE_MENU_TOGGLE_SELECTOR = "a.lefttogglemenulink";
export const SIDE_MENU_NAME_SELECTOR = ".menu-name";
export const SIDE_MENU_ARROW_SELECTOR = ".dropdown-arrow";
export const SIDE_MENU_STATE_ATTR = "data-name";
export const SIDE_MENU_SHOWN = "shown";
export const SIDE_MENU_HIDDEN = "hidden";
export const ACADEMY_APP_PATH_PREFIX = "/Academy/s/";
export const ACADEMY_HOME_URL_MARKER = "/Home/";
export const LOG_PREFIX = "[PESU-MAX]";

const LOGIN_USERNAME_SELECTOR = 'input[name="j_username"]';
const LOGIN_PASSWORD_SELECTOR = 'input[name="j_password"]';
const LOGIN_CAPTCHA_SELECTOR = "#captchaInput, #captchaImg";

const passwordField = () => document.querySelector(LOGIN_PASSWORD_SELECTOR);

export function hasLoginForm() {
  return Boolean(passwordField());
}

export function loginFormEngaged() {
  const password = passwordField();
  if (!password) return false;

  const username = document.querySelector(LOGIN_USERNAME_SELECTOR);
  const form = password.closest("form");

  return Boolean(username && username.value) ||
    Boolean(password.value) ||
    Boolean(form && document.activeElement && form.contains(document.activeElement));
}

export function hasCaptchaGate() {
  return Boolean(document.querySelector(LOGIN_CAPTCHA_SELECTOR));
}
