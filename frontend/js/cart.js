import { BASE_URL } from "./config.js";
import { getCart, addToCart, updateCartItem, removeCartItem } from "./api.js";
import { createSlug, escapeHtml, formatPrice } from "./utils.js";
import { getDeliveryFeeInPence, getFreeDeliveryMessage } from "./deliveryConfig.js";
import { getAutoAppliedDiscount } from "./voucher.js";
import "./customModal.js";

import { syncBasketProducts } from "./overlays/overlayBasket.js";
import { showAddedToBasket } from "./cartButtonFeedback.js";

// ======================================================
// DOM (header markup is injected asynchronously by layout.js, so these
// are (re)bound in `bindHeaderElements`, not read once at import time)
// ======================================================

let basketToggle;
let basketCount;
let cartPanel;
let cartClose;
let cartItemsEl;
let cartDeliveryMessageEl;
let cartSubtotalEl;
let cartDiscountRow;
let cartDiscountLabelEl;
let cartDiscountEl;
let cartDeliveryEl;
let cartTotalEl;
let checkoutButton;
let menuButton;
let mobileNav;
let mobileOverlay;
let mobileNavClose;
let basketItems;
let cartRenderVersion = 0;
let basketMutationVersion = 0;

function bindHeaderElements() {
  basketToggle = document.querySelector("#basket-toggle");
  basketCount = document.querySelector("#basket-count");
  basketItems = document.querySelector(".basket-items");

  cartPanel = document.querySelector("#cart-panel");
  cartClose = document.querySelector("#cart-close");
  cartItemsEl = document.querySelector("#cart-items");
  cartDeliveryMessageEl = document.querySelector("#cart-delivery-message");
  cartSubtotalEl = document.querySelector("#cart-subtotal");
  cartDiscountRow = document.querySelector("#cart-discount-row");
  cartDiscountLabelEl = document.querySelector("#cart-discount-label");
  cartDiscountEl = document.querySelector("#cart-discount");
  cartDeliveryEl = document.querySelector("#cart-delivery");
  cartTotalEl = document.querySelector("#cart-total");

  checkoutButton = document.querySelector("#checkout-button");
  menuButton = document.querySelector("#mobile-menu-toggle");
  mobileNav = document.querySelector("#mobile-nav");
  mobileOverlay = document.querySelector("#mobile-nav-overlay");
  mobileNavClose = document.querySelector("#mobile-nav-close");
}

// ======================================================
// OPEN / CLOSE CART PANEL
// ======================================================

let autoCloseTimer = null;

export function openCart({ autoClose = false } = {}) {
  if (!cartPanel) return;

  // Cancel any previous timer
  clearTimeout(autoCloseTimer);
  autoCloseTimer = null;

  // Already open
  if (!cartPanel.hidden) {
    if (autoClose) {
      autoCloseTimer = setTimeout(() => {
        closeCart();
      }, 3000);
    }

    return;
  }

  cartPanel.hidden = false;

  requestAnimationFrame(() => {
    cartPanel.classList.add("is-open");
  });

  if (autoClose) {
    autoCloseTimer = setTimeout(() => {
      closeCart();
    }, 3000);
  }
}

export function closeCart() {
  if (!cartPanel) return;

  clearTimeout(autoCloseTimer);
  autoCloseTimer = null;

  cartPanel.classList.remove("is-open");

  setTimeout(() => {
    cartPanel.hidden = true;
  }, 450); // match CSS transition duration
}

// ======================================================
// RENDER CART
// ======================================================

export async function renderCart(cart = []) {
  const renderVersion = ++cartRenderVersion;
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalInPence = cart.reduce((total, item) => total + item.priceInPence * item.quantity, 0);
  const deliveryInPence = getDeliveryFeeInPence(subtotalInPence);

  if (basketCount) basketCount.textContent = cartItemCount;

  if (basketItems) {
    basketItems.textContent = `(${cartItemCount} ${cartItemCount === 1 ? "item" : "items"})`;
  }

  if (cartDeliveryMessageEl) {
    cartDeliveryMessageEl.textContent = getFreeDeliveryMessage(subtotalInPence, formatPrice);
  }

  // Clear the previous price adjustment immediately while this basket's
  // voucher is checked. An older pending check must never repaint stale totals.
  if (cartDiscountRow) cartDiscountRow.hidden = true;
  if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(subtotalInPence);
  if (cartDeliveryEl) cartDeliveryEl.textContent = deliveryInPence ? formatPrice(deliveryInPence) : "Free";
  if (cartTotalEl) cartTotalEl.textContent = formatPrice(subtotalInPence + deliveryInPence);

  if (cartItemsEl) {
    cartItemsEl.innerHTML = cart.length === 0
      ? `<li class="empty-cart">Your basket is empty.</li>`
      : cart
          .map((item) => {
            const name = escapeHtml(item.variantName ? `${item.name} — ${item.variantName}` : item.name);
            const productUrl = `/${createSlug(item.name)}/${item.id}`;

            return `
              <li class="cart-item">
                <a href="${productUrl}" aria-label="Visit product ${name}">
                  <img src="${BASE_URL}${item.image}" alt="Image for ${name}">
                </a>

                <div class="cart-item-info">
                  <a href="${productUrl}" aria-label="Visit product ${name}">
                    <strong>${name}</strong>
                  </a>
                  <span>${formatPrice(item.priceInPence)}</span>

                  <div class="quantity-controls">
                    <button type="button" data-action="decrease" data-id="${item.cartItemId}" aria-label="Decrease ${name} quantity">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-action="increase" data-id="${item.cartItemId}" aria-label="Increase ${name} quantity">+</button>
                  </div>
                </div>

                <button type="button" class="remove-item" data-action="remove" data-id="${item.cartItemId}" aria-label="Remove ${name}">×</button>
              </li>
            `;
          })
          .join("");
  }

  const { code: discountCode, discountInPence } = await getAutoAppliedDiscount(subtotalInPence);
  if (renderVersion !== cartRenderVersion) return;

  if (cartDiscountRow && discountCode) {
    cartDiscountRow.hidden = false;
    if (cartDiscountLabelEl) cartDiscountLabelEl.textContent = `Discount (${discountCode})`;
    if (cartDiscountEl) cartDiscountEl.textContent = `−${formatPrice(discountInPence)}`;
  }
  if (cartTotalEl) cartTotalEl.textContent = formatPrice(subtotalInPence - discountInPence + deliveryInPence);
}

// ======================================================
// LOAD CART
// ======================================================

export async function loadCart() {
  const loadVersion = basketMutationVersion;
  try {
    const cart = await getCart();
    if (loadVersion !== basketMutationVersion) return;
    syncBasketProducts(cart);
    renderCart(cart);
  } catch (error) {
    console.error("Failed to load cart:", error);
  }
}

// ======================================================
// BASKET ANIMATION
// ======================================================

export function animateBasket() {
  if (!basketToggle) return;

  basketToggle.classList.remove("basket-pop");
  void basketToggle.offsetWidth; // restart animation on rapid adds
  basketToggle.classList.add("basket-pop");
}

// ======================================================
// ADD TO CART (delegated — works on any page with .add-to-bag buttons,
// regardless of whether the header has finished loading yet)
// ======================================================

export function initialiseAddToCart() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".add-to-bag");

    if (!button) return;

    const productId = Number(button.dataset.productId);

    try {
      const cart = await addToCart(productId);
      showAddedToBasket(button);

      openCart({
        autoClose: true,
      });
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  });
}

document.addEventListener("basket:updated", (event) => {
  const cart = event.detail?.cart;
  if (!Array.isArray(cart)) return;

  basketMutationVersion += 1;
  syncBasketProducts(cart);
  void renderCart(cart);
  if (event.detail.action === "add") animateBasket();
});

// ======================================================
// HEADER UI (basket panel + mobile menu) — bound once the header markup
// is actually in the DOM.
// ======================================================

function bindHeaderInteractions() {
  bindHeaderElements();

  // No header on this page (e.g. checkout uses its own simplified header).
  if (!cartPanel) return;

  // Guard against binding twice if this ever runs more than once.
  if (cartPanel.dataset.cartBound === "true") return;
  cartPanel.dataset.cartBound = "true";

  basketToggle?.addEventListener("click", () => {
    !cartPanel.hidden ? closeCart() : openCart();
  });

  cartClose?.addEventListener("click", closeCart);

  cartItemsEl?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

      const cartItemId = Number(button.dataset.id);
    const action = button.dataset.action;

    try {
      const cart = await getCart();
      const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);
      if (!item) return;

      if (action === "increase") {
        await updateCartItem(cartItemId, item.quantity + 1);
      }

      if (action === "decrease") {
        if (item.quantity === 1) await removeCartItem(cartItemId);
        else await updateCartItem(cartItemId, item.quantity - 1);
      }

      if (action === "remove") {
        await removeCartItem(cartItemId);
      }
    } catch (error) {
      console.error("Failed to update cart:", error);
    }
  });

  checkoutButton?.addEventListener("click", () => {
    window.location.assign("/checkout");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !cartPanel.hidden) {
      closeCart();
      basketToggle?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const clickedInsideCart = cartPanel.contains(event.target);
    const clickedBasketButton = basketToggle?.contains(event.target);

    if (!clickedInsideCart && !clickedBasketButton && !cartPanel.hidden) {
      closeCart();
    }
  });

  // Mobile menu
  const openMenu = () => {
    mobileNav?.classList.add("active");
    mobileOverlay?.classList.add("active");
    document.body.classList.add("menu-open");
  };

  const closeMenu = () => {
    mobileNav?.classList.remove("active");
    mobileOverlay?.classList.remove("active");
    document.body.classList.remove("menu-open");
  };

  menuButton?.addEventListener("click", openMenu);
  mobileNavClose?.addEventListener("click", closeMenu);
  mobileOverlay?.addEventListener("click", closeMenu);

  document.querySelectorAll(".mobile-nav a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  loadCart();
}

// ======================================================
// INIT — call once, on every page
// ======================================================

initialiseAddToCart();

// Header is either already in the page (legacy/edge case) or will be
// injected shortly by layout.js — cover both.
bindHeaderInteractions();
document.addEventListener("layout:ready", bindHeaderInteractions);
