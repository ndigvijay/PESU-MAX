import { load } from "../utils/storage.js";
import { TOP_BAR_KEY } from "../utils/storageKeys.js";

const STYLE_ID = "pesu-max-hide-top-bar-style";

// Top bar and the space it takes.
const CSS = `
  #pge_menu { display: none !important; }
  body > .content-wrapper { padding-top: 0 !important; }
`;

function apply(enabled) {
  const existing = document.getElementById(STYLE_ID);

  if (!enabled) {
    if (existing) existing.remove();
    return;
  }

  if (existing) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Off by default.
export async function initHideTopBar() {
  apply((await load(TOP_BAR_KEY)) === true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[TOP_BAR_KEY]) return;
    apply(changes[TOP_BAR_KEY].newValue === true);
  });
}
