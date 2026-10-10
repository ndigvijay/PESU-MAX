import { load } from "../utils/storage.js";
import { SIDE_MENU_DOCK_KEY } from "../utils/storageKeys.js";
import { ACADEMY_APP_PATH_PREFIX } from "./academyPage.js";
import { DOCK_ATTR, readDockMirror } from "./sideMenuDock/dockState.js";

const pinDock = () => document.documentElement.setAttribute(DOCK_ATTR, "");

if (location.pathname.startsWith(ACADEMY_APP_PATH_PREFIX)) {
  const mirrored = readDockMirror();

  if (mirrored === "1") pinDock();
  else if (mirrored === null) {
    load(SIDE_MENU_DOCK_KEY)
      .then((enabled) => {
        if (enabled === true) pinDock();
      })
      .catch(() => {});
  }
}
