// Injects the shared header/footer markup (frontend/components/*.html)
// into any page that has `#site-header` / `#site-footer` placeholders.
//
// Other modules (e.g. cart.js) can't assume this markup exists as soon as
// they run, because injection happens asynchronously. Instead they should
// listen for the `layout:ready` event dispatched below once both partials
// are in the DOM.
import { initialiseOverlays } from "./overlays/overlayManager.js";

async function includePartial(selector, url) {
  const target = document.querySelector(selector);

  if (!target) {
    return;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }

    target.outerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

async function loadLayout() {
  await Promise.all([
    includePartial("#site-header", "/components/header.html"),
    includePartial("#site-footer", "/components/footer.html"),
    includePartial("#site-custom-cake-modal", "/components/customcakemodal.html"),
    includePartial("#site-account-modal", "/components/accountmodal.html"),
  ]);

  document.dispatchEvent(new CustomEvent("layout:ready"));

  // Waits until the header/footer/modals exist so the welcome overlay
  // never renders under or on top of half-loaded layout, and so
  // overlayRules can correctly check the current page against its
  // excluded-pages list.
  initialiseOverlays();
}

loadLayout();
