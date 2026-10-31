import { icon } from "./icon.js";

const feedbackTimers = new WeakMap();

export function showAddedToBasket(button, { duration = 1800 } = {}) {
  if (!button) return;

  const label = button.querySelector("[data-cart-button-label]") || button.querySelector("span");
  const glyph = button.querySelector("svg");
  if (!label || !glyph) return;

  const defaultLabel = label.dataset.defaultText || label.textContent.trim();
  const defaultIcon = glyph.dataset.iconName || "basket-lines";
  const defaultAriaLabel = button.dataset.defaultAriaLabel || button.getAttribute("aria-label");
  label.dataset.defaultText = defaultLabel;
  glyph.dataset.iconName = defaultIcon;
  if (defaultAriaLabel) button.dataset.defaultAriaLabel = defaultAriaLabel;

  clearTimeout(feedbackTimers.get(button));
  label.textContent = "Added to Basket";
  glyph.outerHTML = icon("check", { className: glyph.getAttribute("class") || "" });
  if (defaultAriaLabel) button.setAttribute("aria-label", "Added to basket");
  button.classList.add("is-added");

  feedbackTimers.set(button, setTimeout(() => {
    const currentLabel = button.querySelector("[data-cart-button-label]") || button.querySelector("span");
    const currentIcon = button.querySelector("svg");
    if (currentLabel) currentLabel.textContent = defaultLabel;
    if (currentIcon) currentIcon.outerHTML = icon(defaultIcon, { className: currentIcon.getAttribute("class") || "" });
    if (defaultAriaLabel) button.setAttribute("aria-label", defaultAriaLabel);
    button.disabled = false;
    button.classList.remove("is-added");
    feedbackTimers.delete(button);
  }, duration));
}
