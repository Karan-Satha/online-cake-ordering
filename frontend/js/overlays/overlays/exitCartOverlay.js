import { markOverlayShown, getStorageItem } from "../overlayStorage.js";
import { getAutoAppliedDiscount } from "../../voucher.js";
import { getBasketProducts } from "../overlayBasket.js";
import { dismissOverlayElement } from "../overlayRenderer.js";
import { icon as sharedIcon } from "../../icon.js";
import { assetUrl } from "../../config.js";
import { escapeHtml } from "../../utils.js";

const FREE_DELIVERY_THRESHOLD = 5000;

const icon = (name, size = 24, extraClass = "") =>
  sharedIcon(
    name === "shield" ? "shield-trust" : name === "tick" ? "check-circle" : name === "truck" ? "truck-trust" : name,
    {
      width: size,
      height: size,
      className: `hc-icon ${extraClass}`.trim(),
    },
  );

export async function renderExitCartOverlay(products) {
  const existing = document.querySelector(".hc-overlay");
  if (existing) existing.remove();

  const basketItems = getBasketProducts();

  const basketTotal = basketItems.reduce((total, product) => total + product.priceInPence * (product.quantity || 1), 0);

  const totalItems = basketItems.reduce((count, item) => count + (item.quantity || 1), 0);

  const freeDeliveryEligible = basketTotal >= FREE_DELIVERY_THRESHOLD;

  const amountUntilFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - basketTotal);

  const voucher = getStorageItem("voucher") || (await getAutoAppliedDiscount(basketTotal));

  const discountInPence = voucher?.discountPercent
    ? Math.round((basketTotal * voucher.discountPercent) / 100)
    : voucher?.discountInPence || 0;

  const finalTotal = basketTotal - discountInPence;

  const overlay = document.createElement("div");
  overlay.className = "hc-overlay";
  overlay.innerHTML = `
    <section class="hc-dialog" role="dialog" aria-modal="true" aria-labelledby="hc-title">
      <button class="hc-close" aria-label="Close">&times;</button>

      <div class="hc-main">
        <div class="hc-brand">
          <span class="hc-brand__heart">${icon("heart")}</span>
          <p class="hc-brand__name">HOME CAKE</p>
          <p class="hc-brand__tag">Cakes for every occasion</p>
        </div>
        <p class="hc-wait">WAIT…</p>
        <h2 id="hc-title" class="hc-title">Your cakes are waiting for you</h2>
        <p class="hc-subtitle">Complete your order before your delicious treats are forgotten.</p>

        <div class="hc-products">
          ${products
            .map(
              (product) => `
            <article class="hc-product">
              <img src="${escapeHtml(assetUrl(product.image))}" alt="${escapeHtml(product.name)}">
              <div class="hc-product__info">
                <h3 class="hc-product__name">${product.name}</h3>

                <p class="hc-product__desc">
                  ${(product.description || "").slice(0, 80)}
                  ${(product.description || "").length > 80 ? "..." : ""}
                </p>

                <div class="hc-product__row">
                  <span class="hc-product__qty">
                    Qty: ${product.quantity || 1}
                  </span>

                  <div class="hc-product__prices">
                    ${
                      product.oldPriceInPence && product.oldPriceInPence > product.priceInPence
                        ? `
                          <span class="hc-product__price-old">
                            £${(product.oldPriceInPence / 100).toFixed(2)}
                          </span>
                        `
                        : ""
                    }

                    <strong class="hc-product__price">
                      £${(product.priceInPence / 100).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </article>
          `,
            )
            .join("")}
        </div>

        <div class="hc-trust">
          <div class="hc-trust__item"><span>${icon("heart")}</span><p>Handmade<small>Fresh To Order</small></p></div>
          <div class="hc-trust__item"><span>${icon("shield")}</span><p>Secure<small>Checkout</small></p></div>
          <div class="hc-trust__item"><span>${icon("truck")}</span><p>Local Delivery<small>Available</small></p></div>
        </div>
      </div>

      <aside class="hc-summary">
        <p class="hc-summary__heading">Your order summary</p>
        <div class="hc-summary__row">
          <span>Basket Total (${totalItems} ${totalItems === 1 ? "item" : "items"})</span>
          <strong>£${(basketTotal / 100).toFixed(2)}</strong>
        </div>

        ${
          freeDeliveryEligible
            ? `
          <div class="hc-delivery hc-delivery--free">
            <p class="hc-delivery__title">
              ${icon("truck", 18)}
              <strong>Free delivery applied</strong>
              ${icon("tick", 20, "hc-icon--tick")}
            </p>
            <small>You've qualified for free delivery!</small>
          </div>
        `
            : `
          <div class="hc-delivery hc-delivery--progress">
            <p class="hc-delivery__title">
              ${icon("truck", 18)}
              <strong>Spend £${(amountUntilFreeDelivery / 100).toFixed(2)} more</strong>
            </p>
            <small>Add a little more to get free delivery on your order.</small>
            <div class="hc-delivery__bar"><div style="width: ${Math.min(100, basketTotal / 50)}%"></div></div>
          </div>
        `
        }

        ${
          voucher
            ? `
          <div class="hc-voucher-cart">
            <p>${icon("tag", 18)} Voucher Applied <strong>− £${(discountInPence / 100).toFixed(2)}</strong></p>
            <span class="hc-voucher-cart__code">${voucher.code || voucher.name || "DISCOUNT"}</span>
            <small>You save ${voucher.discountPercent || 0}% on this order!</small>
          </div>
        `
            : ""
        }

        ${
          discountInPence > 0
            ? `
          <div class="hc-summary__row">
            <span>Total Saved</span><strong>£${(discountInPence / 100).toFixed(2)}</strong>
          </div>
        `
            : ""
        }

        <div class="hc-summary__total">
          <span>Final Total</span><strong>£${(finalTotal / 100).toFixed(2)}</strong>
        </div>

        <a class="hc-cta" href="/checkout">Complete my order <img src="/assets/images/button-rght-arrow.webp" /></a>
        <button class="hc-continue" type="button">Continue Shopping</button>
      </aside>
    </section>
  `;

  const close = () => dismissOverlayElement(overlay);

  overlay.querySelector(".hc-close").addEventListener("click", close);
  overlay.querySelector(".hc-continue").addEventListener("click", close);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });

  markOverlayShown("exitCart", 24);
  document.body.appendChild(overlay);
}
