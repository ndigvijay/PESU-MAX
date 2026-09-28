function find(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    return null;
  }
}

function clickElement(el) {
  if (typeof el.click === "function") el.click();
  else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

export async function replay($, recorder, chain) {
  for (const action of chain) {
    const el = find(action.selector);
    if (!el) return false;
    if (action.kind === "select") {
      el.value = action.value;
      $(el).trigger("change");
    } else {
      clickElement(el);
    }
    await recorder.idle();
  }
  return true;
}
