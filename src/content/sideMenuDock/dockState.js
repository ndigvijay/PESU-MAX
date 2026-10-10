export const DOCK_ATTR = "data-pesu-max-dock";
export const DOCK_OPEN_ATTR = "data-pesu-max-dock-open";
export const DOCK_CLOSING_ATTR = "data-pesu-max-dock-closing";
export const DOCK_MIRROR_KEY = "pesuMaxSideMenuDock";

export function readDockMirror() {
  try {
    return localStorage.getItem(DOCK_MIRROR_KEY);
  } catch (error) {
    return null;
  }
}

export function writeDockMirror(enabled) {
  try {
    localStorage.setItem(DOCK_MIRROR_KEY, enabled ? "1" : "0");
  } catch (error) {
  }
}
