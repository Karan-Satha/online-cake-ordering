import { addToCart } from "../../api.js";
import { markOverlayShown, getStorageItem } from "../overlayStorage.js";
import { getExitIntentProducts, getViewedProducts } from "../overlayViewedProducts.js";
import { assetUrl } from "../../config.js";
import { dismissOverlayElement } from "../overlayRenderer.js";
import { icon as sharedIcon } from "../../icon.js";
import { storePendingVoucher } from "../../voucher.js";
import { showAddedToBasket } from "../../cartButtonFeedback.js";

const icon = (name) =>
  sharedIcon(
    {
      basket: "basket-lines",
      arrow: "arrow-right",
      heart: "heart-outline",
      gift: "gift-bag",
      lock: "lock-secure",
      truck: "delivery-truck",
    }[name] || name,
  );

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export async function renderViewedProductsOverlay() {
  const products = getExitIntentProducts().slice(0, 2);
  if (!products.length) return;

  document.querySelector(".hc-overlay")?.remove();

  const voucher = getStorageItem("appliedVoucher") || getStorageItem("voucher");
  const hasVoucher = Boolean(voucher?.code);
  const totalViewedProducts = getViewedProducts().length;
  const voucherCodeValue = voucher?.code || "WELCOME10";
  const voucherCode = escapeHtml(voucherCodeValue);
  const discount = escapeHtml(voucher?.discountPercent || 10);

  const productsMarkup = products
    .map(
      (product) => `
        <article class="hc-viewed-card">
          <div class="hc-viewed-card__image-wrapper">
          <img src="${escapeHtml(assetUrl(product.image))}" alt="${escapeHtml(product.name)}" class="hc-viewed-card__image" />
            <button class="hc-viewed-card__favourite" type="button" aria-label="Add ${escapeHtml(product.name)} to favourites" aria-pressed="false">
              ${icon("heart")}
            </button>
          </div>
          <div class="hc-viewed-card__content">
            <h3 class="hc-viewed-card__title">${escapeHtml(product.name)}</h3>
            <p class="hc-viewed-card__description">${escapeHtml((product.description || "").slice(0, 120))}</p>
            <div class="hc-viewed-card__pricing">
              ${product.oldPriceInPence && product.oldPriceInPence > product.priceInPence ? `<span class="hc-viewed-card__old-price">£${(product.oldPriceInPence / 100).toFixed(2)}</span>` : ""}
              <span class="hc-viewed-card__price">£${(product.priceInPence / 100).toFixed(2)}</span>
            </div>
            <button class="hc-viewed-card__button" type="button" data-product-id="${Number(product.id)}">
              ${icon("basket")}<span>Add To Basket</span>
            </button>
          </div>
        </article>`,
    )
    .join("");

  const thumbnails = products
    .slice(0, 3)
    .map((product) => `<img src="${escapeHtml(assetUrl(product.image))}" alt="" />`)
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "hc-overlay";
  overlay.innerHTML = `
    <section class="hc-viewed" role="dialog" aria-modal="true" aria-labelledby="hc-viewed-title">      

      <button class="hc-viewed__close" type="button" aria-label="Close offer">${icon("close")}</button>

      <header class="hc-viewed__header">
        <span class="hc-viewed__brand-heart">${icon("heart")}</span>
        <div class="hc-viewed__logo">HOME CAKE</div>
        <div class="hc-viewed__tagline"><span></span>CAKES FOR EVERY OCCASION<span></span></div>
        <h2 class="hc-viewed__title" id="hc-viewed-title">Still thinking about<br /> these cakes?</h2>
        <p class="hc-viewed__subtitle">You recently viewed these delicious cakes.<br />Add them to your basket before you leave.</p>
      </header>

      <div class="hc-viewed__body">
        <div class="hc-viewed__products">${productsMarkup}</div>
        <aside class="hc-viewed__sidebar">
          <div class="hc-viewed-voucher">
            <span class="hc-viewed-voucher__icon">${icon("gift")}</span>
            <h3>Your discount<br />is ready!</h3>
            <div class="hc-viewed-voucher__code">${voucherCode}</div>
            ${
              hasVoucher
                ? `<p>Save ${discount}% on<br />your order today.</p>`
                : `<button class="hc-viewed-voucher__copy" type="button" aria-label="Copy voucher code">${icon("copy")}<span>Copy code</span></button><p class="hc-viewed-voucher__copy-status" aria-live="polite"></p><p>Save ${discount}% on<br />your order today.</p>`
            }
          </div>
          <ul class="hc-viewed-trust">
            <li><span>${icon("leaf")}</span><strong>Handmade<br />Fresh Daily</strong></li>
            <li><span>${icon("lock")}</span><strong>Secure Checkout</strong></li>
            <li><span>${icon("truck")}</span><strong>Local Delivery<br />Available</strong></li>
          </ul>
        </aside>
      </div>

      <footer class="hc-viewed__footer">
        <div class="hc-viewed__recent">
          <div class="hc-viewed__thumbnails">${thumbnails}</div>
          <p><strong>You viewed ${totalViewedProducts} cakes recently.</strong><span>Browse our full range of delicious cakes.</span></p>
        </div>
        <div class="hc-viewed__actions">
          <a href="/shop/all" class="hc-viewed__browse">Browse All Cakes <img
              width="50px"
              src="/assets/images/button-rght-arrow.webp"
              alt="Button Click Right Arrow"
              loading="lazy"
              decoding="async"
            /></a>
          <button class="hc-viewed__continue" type="button">Continue Shopping</button>
        </div>
      </footer>
    </section>`;

  const close = () => dismissOverlayElement(overlay);

  overlay.querySelector(".hc-viewed__close")?.addEventListener("click", close);
  overlay.querySelector(".hc-viewed__continue")?.addEventListener("click", close);

  const voucherCopyButton = overlay.querySelector(".hc-viewed-voucher__copy");
  voucherCopyButton?.addEventListener("click", async () => {
    const status = overlay.querySelector(".hc-viewed-voucher__copy-status");
    voucherCopyButton.disabled = true;
    try {
      await copyVoucherCode(voucherCodeValue);
      storePendingVoucher(voucherCodeValue);
      voucherCopyButton.innerHTML = `${icon("check")}<span>Copied</span>`;
      voucherCopyButton.classList.add("is-copied");
      setTimeout(() => {
        if (!voucherCopyButton.isConnected) return;
        voucherCopyButton.innerHTML = `${icon("copy")}<span>Copy code</span>`;
        voucherCopyButton.classList.remove("is-copied");
        voucherCopyButton.disabled = false;
      }, 2000);
    } catch {
      status.setAttribute("role", "alert");
      status.textContent = "We couldn’t copy the code. Please select and copy it above.";
      voucherCopyButton.disabled = false;
    }
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelectorAll(".hc-viewed-card__favourite").forEach((button) => {
    button.addEventListener("click", () => {
      const active = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!active));
      button.classList.toggle("is-active", !active);
    });
  });

  overlay.querySelectorAll(".hc-viewed-card__button").forEach((button) => {
    button.addEventListener("click", async () => {
      const productId = Number(button.dataset.productId);
      try {
        button.disabled = true;
        await addToCart(productId, 1);
        button.classList.add("is-added");
        showAddedToBasket(button);
      } catch (error) {
        button.disabled = false;
        console.error(error);
      }
    });
  });

  markOverlayShown("exitViewed", 24);
  document.body.appendChild(overlay);
  overlay.querySelector(".hc-viewed__close")?.focus();
}

async function copyVoucherCode(code) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      return;
    } catch {
      // Try the legacy clipboard path below when browser permissions deny access.
    }
  }

  const input = document.createElement("textarea");
  input.value = code;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  let copied = false;
  try {
    copied = typeof document.execCommand === "function" && document.execCommand("copy");
  } finally {
    input.remove();
  }
  if (!copied) throw new Error("Clipboard copy failed");
}
