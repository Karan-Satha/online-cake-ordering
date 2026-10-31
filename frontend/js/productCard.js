import { assetUrl } from "./config.js";
import {
  formatPrice,
  calculateDiscountPercentage,
  createSlug,
  escapeHtml,
} from "./utils.js";
import { icon } from "./icon.js";

export function createProductCard(product) {
  const item = document.createElement("li");

  item.className = "product-card";

  const hasDiscount =
    product.oldPriceInPence && product.oldPriceInPence > product.priceInPence;

  const name = escapeHtml(product.name);
  const categoryName = escapeHtml(product.categoryName);
  const productUrl = `/${createSlug(product.name)}/${product.id}`;

  item.innerHTML = `
    <article class="product">

      ${
        hasDiscount
          ? `
            <div class="product-card__saving">
              Save ${calculateDiscountPercentage(
                product.priceInPence,
                product.oldPriceInPence,
              )}%
            </div>
          `
          : ""
      }

      <a
        href="${productUrl}"
        class="product-card__image"
        aria-label="View ${name}"
      >
        <img
          src="${escapeHtml(assetUrl(product.image))}"
          alt="${name}"
          loading="lazy"
          decoding="async"
        >
        ${product.isBestseller ? '<span class="product-card__badge">Best Seller</span>' : ""}
      </a>

      <div class="product-card__content">

        <h3 class="product-card__title">
          <a href="${productUrl}">
            ${name}
          </a>
        </h3>

        ${
          product.categoryName
            ? `
              <p class="product-card__category">
                ${categoryName}
              </p>
            `
            : ""
        }

        <div class="product-card__pricing">

          ${
            hasDiscount
              ? `
                <span class="product-card__old-price">
                  ${formatPrice(product.oldPriceInPence)}
                </span>
              `
              : ""
          }

          <span class="product-card__price">
            ${formatPrice(product.priceInPence)}
          </span>

        </div>

        <button
          class="add-to-bag"
          type="button"
          data-product-id="${product.id}"
          aria-label="Add ${name} to basket"
        >
          ${icon("basket-lines", { className: "add-to-bag__icon" })}
          <span data-cart-button-label>Add to Basket</span>
        </button>

      </div>

    </article>
  `;

  return item;
}
