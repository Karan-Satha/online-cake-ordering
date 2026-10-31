import { getStorageItem, hasOverlayExpired, getCustomerProfile } from "./overlayStorage.js";
import { getBasketProducts } from "./overlayBasket.js";

import { renderWelcomeOverlay } from "./overlays/welcomeOverlay.js";
import { renderExitCartOverlay } from "./overlays/exitCartOverlay.js";
import { renderViewedProductsOverlay } from "./overlays/viewedProductsOverlay.js";

export function evaluateWelcomeOverlay() {
  const shown = getStorageItem("welcomeVoucherShown");

  if (shown || getCustomerProfile().visits > 1) {
    return;
  }

  const excludedPages = ["/checkout", "/account", "/cart"];

  const currentPath = window.location.pathname;

  const shouldSkip = excludedPages.some((path) => currentPath.includes(path));

  if (shouldSkip) {
    return;
  }

  setTimeout(() => {
    if (!getStorageItem("welcomeVoucherShown")) renderWelcomeOverlay();
  }, 5000);
}

export function evaluateExitIntentOverlay() {
  const basketProducts = getBasketProducts();

  /**
   * Basket abandonment overlay
   */
  if (basketProducts.length > 0) {
    if (!hasOverlayExpired()) {
      return;
    }

    let products = [];

    if (basketProducts.length === 1) {
      products = [basketProducts[0]];
    } else {
      const firstProduct = basketProducts[0];
      const lastProduct = basketProducts[basketProducts.length - 1];

      products = [firstProduct, lastProduct].filter(
        (product, index, array) => array.findIndex((item) => item.id === product.id) === index,
      );
    }

    renderExitCartOverlay(products);

    return;
  }

  /**
   * Viewed products overlay
   */
  const viewedProducts = getStorageItem("viewedProducts") || [];

  if (viewedProducts.length < 2) {
    return;
  }

  if (!hasOverlayExpired()) {
    return;
  }

  renderViewedProductsOverlay();
}
