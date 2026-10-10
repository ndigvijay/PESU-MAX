import { buildIcon } from "../menuIcons/menuIconsApply.js";

export function glyph(name) {
  const holder = document.createElement("span");
  holder.className = "pesu-max-dock-glyph";
  const icon = buildIcon(name);
  if (icon) holder.appendChild(icon);
  return holder;
}
