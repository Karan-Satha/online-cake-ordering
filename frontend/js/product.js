import { getProduct, addToCart, getRelatedProducts } from "./api.js";
import { assetUrl } from "./config.js";
import { calculateDiscountPercentage, escapeHtml, formatPrice, getProductIdFromUrl } from "./utils.js";
import { openCart } from "./cart.js";
import { loadProducts } from "./carouselProductService.js";
import { trackViewedProduct } from "./overlays/overlayViewedProducts.js";
import { showAddedToBasket } from "./cartButtonFeedback.js";

const productContainer = document.querySelector("[data-product-container]");
const productImage = document.querySelector("[data-product-image]");
const productName = document.querySelector("[data-product-name]");
const productDescription = document.querySelector("[data-product-description]");
const productPrice = document.querySelector("[data-product-price]");
const productOldPrice = document.querySelector("[data-product-old-price]");
const productSavings = document.querySelector("[data-product-savings]");
const productStock = document.querySelector("[data-product-stock]");
const quantityIncrease = document.querySelector("#increase-quantity");
const quantityDecrease = document.querySelector("#decrease-quantity");
const quantityValue = document.querySelector("#quantity-input");
const addToBagButton = document.querySelector(".add-to-cart-btn");
const productNameBreadcrumb = document.querySelector(".product-page span[data-product-category]");
const productBreadcrumbCurrent = document.querySelector("[data-product-breadcrumb-current]");
const productCategoryLink = document.querySelector("[data-product-category-link]");
const productCategoryName = document.querySelector("[data-product-category-name]");
const galleryThumbnails = document.querySelector("[data-product-thumbnails]");
const galleryImageCount = document.querySelector("[data-product-image-count]");
const variantFieldset = document.querySelector("[data-product-variants]");
const variantOptions = document.querySelector("[data-variant-options]");
const addToCartError = document.querySelector("[data-product-action-error]");

const detailFields = {
  ingredients: document.querySelector("[data-product-ingredients]"),
  allergens: document.querySelector("[data-product-allergens]"),
  allergyAdvice: document.querySelector("[data-product-allergy-advice]"),
  storage: document.querySelector("[data-product-storage]"),
  shelfLife: document.querySelector("[data-product-shelf-life]"),
  nutrition: document.querySelector("[data-product-nutrition]"),
};

let product = null;
let selectedVariant = null;

const productId = getProductIdFromUrl();

let currentQuantity = Number(quantityValue?.value) || 1;

export async function loadProduct() {
  if (!productId) {
    showError("Product not found.");
    return;
  }

  try {
    product = await getProduct(productId);
    renderProduct();
    productContainer.setAttribute("aria-busy", "false");

    trackViewedProduct(product);
  } catch (error) {
    console.error(error);
    showError("Unable to load product.");
  }
}

export function renderProduct() {
  if (!product) return;

  if (productNameBreadcrumb) productNameBreadcrumb.textContent = product.categoryName || "Cakes";
  if (productBreadcrumbCurrent) productBreadcrumbCurrent.textContent = product.name;
  if (productCategoryLink && product.categorySlug) productCategoryLink.href = `/shop/${product.categorySlug}`;
  if (productCategoryName) productCategoryName.textContent = product.categoryName || "Handcrafted by Home Cake";

  const gallery = [...new Set([product.image, ...(product.imageGallery || [])].filter(Boolean))];
  renderProductGallery(gallery);

  if (productName) productName.textContent = product.name;
  if (productDescription) productDescription.textContent = product.description;
  if (productPrice) productPrice.textContent = formatPrice(product.priceInPence);
  if (productOldPrice) {
    const hasDiscount = product.oldPriceInPence && product.oldPriceInPence > product.priceInPence;

    if (hasDiscount) {
      productOldPrice.textContent = formatPrice(product.oldPriceInPence);
      productOldPrice.hidden = false;
    } else {
      productOldPrice.hidden = true;
    }
    if (productSavings) {
      productSavings.hidden = !hasDiscount;
      productSavings.textContent = hasDiscount
        ? `Save ${calculateDiscountPercentage(product.priceInPence, product.oldPriceInPence)}%`
        : "";
    }
  }

  if (productStock) {
    const inStock = product.stockQuantity > 0;
    productStock.textContent = inStock ? "In Stock" : "Out of Stock";
    productStock.classList.toggle("in-stock", inStock);
    productStock.classList.toggle("out-of-stock", !inStock);
  }

  renderVariants(product.variants || []);
  renderProductDetails(product);
  if (addToBagButton) addToBagButton.disabled = !(product.stockQuantity > 0);

  document.title = `${product.name} | Home Cake`;
}

function renderProductGallery(images) {
  if (!productImage) return;
  const currentImages = images.length ? images : [product.image];
  const setImage = (src, index) => {
    productImage.src = assetUrl(src);
    productImage.alt = `${product.name}${currentImages.length > 1 ? `, photo ${index + 1} of ${currentImages.length}` : ""}`;
    galleryThumbnails?.querySelectorAll("button").forEach((button) => {
      const active = Number(button.dataset.index) === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };
  setImage(currentImages[0], 0);
  if (galleryThumbnails) {
    galleryThumbnails.innerHTML = currentImages.length > 1 ? currentImages.map((src, index) => `
      <button type="button" class="product-thumbnail${index === 0 ? " is-active" : ""}" data-index="${index}" aria-label="Show product photo ${index + 1}" aria-pressed="${index === 0}">
        <img src="${escapeHtml(assetUrl(src))}" alt="" loading="lazy" />
      </button>`).join("") : "";
    galleryThumbnails.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => setImage(currentImages[Number(button.dataset.index)], Number(button.dataset.index)));
    });
  }
  if (galleryImageCount) {
    galleryImageCount.hidden = currentImages.length < 2;
    galleryImageCount.textContent = `${currentImages.length} photos`;
  }
}

function renderVariants(variants) {
  selectedVariant = null;
  if (!variantFieldset || !variantOptions) return;
  variantFieldset.hidden = variants.length === 0;
  variantOptions.innerHTML = variants.map((variant, index) => `
    <label class="product-variant-option${index === 0 ? " is-selected" : ""}">
      <input type="radio" name="productVariant" value="${variant.id}"${index === 0 ? " checked" : ""}>
      <span class="product-variant-option__copy"><strong>${escapeHtml(variant.name)}</strong>${variant.servings ? `<span>Serves ${Number(variant.servings)}</span>` : ""}${variant.details ? `<span>${escapeHtml(variant.details)}</span>` : ""}</span>
      <span class="product-variant-option__price">${formatPrice(variant.priceInPence)}</span>
    </label>`).join("");
  if (variants.length) {
    if (productOldPrice) productOldPrice.hidden = true;
    selectedVariant = variants[0];
    variantOptions.querySelectorAll('input[name="productVariant"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        selectedVariant = variants.find((variant) => String(variant.id) === radio.value) || null;
        variantOptions.querySelectorAll(".product-variant-option").forEach((label) => label.classList.toggle("is-selected", label.contains(radio) && radio.checked));
        if (productPrice && selectedVariant) productPrice.textContent = formatPrice(selectedVariant.priceInPence);
      });
    });
  } else {
    if (productOldPrice) {
      const hasDiscount = product.oldPriceInPence && product.oldPriceInPence > product.priceInPence;
      productOldPrice.hidden = !hasDiscount;
    }
    if (productPrice) productPrice.textContent = formatPrice(product.priceInPence);
  }
}

function renderProductDetails(item) {
  const ingredientCopy = item.ingredients?.trim();
  detailFields.ingredients.replaceChildren();
  appendInfoLabel(detailFields.ingredients, ingredientCopy ? "Product information" : "General cake ingredient guidance");
  appendInfoParagraph(detailFields.ingredients, ingredientCopy || "Cakes are commonly made with a combination of flour, sugar, eggs, fats, raising agents and flavourings, with additional fillings and decorations depending on the recipe. Ingredients vary by cake, flavour, filling and decoration, so this general guidance is not a full ingredient list for this product.");

  detailFields.allergens.replaceChildren();
  const allergyAdviceLabel = document.querySelector("[data-allergy-advice-label]");
  if (item.allergens?.trim()) {
    appendInfoLabel(detailFields.allergens, "Product-specific allergen information");
    appendInfoParagraph(detailFields.allergens, `Declared allergens: ${item.allergens.trim()}`);
  } else {
    appendInfoLabel(detailFields.allergens, "Product-specific information unavailable");
    appendInfoParagraph(detailFields.allergens, "The allergen status for this cake has not been provided.");
  }
  detailFields.allergyAdvice.textContent = item.allergyAdvice?.trim()
    || "Please contact Home Cake before ordering if you have an allergy or dietary concern. We can confirm the relevant information before you place your order.";
  detailFields.allergyAdvice.classList.toggle("product-info-general", !item.allergyAdvice?.trim());
  if (allergyAdviceLabel) allergyAdviceLabel.textContent = item.allergyAdvice?.trim() ? "Product-specific allergy advice" : "When information is unavailable";
  detailFields.storage.replaceChildren();
  detailFields.shelfLife.replaceChildren();
  if (item.storageInstructions?.trim()) appendInfoParagraph(detailFields.storage, item.storageInstructions.trim(), "Product-specific storage instructions");
  if (item.shelfLife?.trim()) appendInfoParagraph(detailFields.shelfLife, `Shelf life: ${item.shelfLife.trim()}`, "Product-specific shelf life");
  appendInfoParagraph(detailFields.storage, "Keep the cake protected from heat and direct sunlight. Cakes with fresh cream, custard, cream cheese or other perishable fillings should be refrigerated and handled promptly. Transport on a flat, secure surface and allow the cake to settle before serving. Storage needs and shelf life vary by cake; any specific instructions supplied with this product should take precedence.", "General cake care guidance");
  renderNutrition(item.nutrition);
}

function appendInfoLabel(target, text) {
  const label = document.createElement("p");
  label.className = "product-info-source";
  label.textContent = text;
  target.append(label);
}

function appendInfoParagraph(target, text, label) {
  if (label) appendInfoLabel(target, label);
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  target.append(paragraph);
}

function renderNutrition(nutrition) {
  const target = detailFields.nutrition;
  if (!target) return;
  const nutrients = [
    ["energyKcal", "Energy", "kcal"], ["energyKj", "Energy", "kJ"], ["fat", "Fat", "g"],
    ["saturates", "of which saturates", "g"], ["carbohydrates", "Carbohydrate", "g"],
    ["sugars", "of which sugars", "g"], ["protein", "Protein", "g"], ["salt", "Salt", "g"],
  ];
  const bases = [["per100g", "Per 100 g"], ["perPortion", "Per portion"]]
    .filter(([key]) => nutrition?.[key] && nutrients.some(([field]) => nutrition[key][field] != null));
  if (!bases.length) {
    appendInfoLabel(target, "General nutrition guidance — not the nutritional values of this cake");
    appendInfoParagraph(target, "Nutrition varies with the recipe, flavour, filling, decoration and portion size. A product-specific nutrition breakdown has not been supplied, so no numerical values are shown. Please contact Home Cake if you need nutrition details before ordering.");
    return;
  }
  appendInfoLabel(target, "Product-specific nutrition information");
  target.innerHTML = `<div class="nutrition-tables">${bases.map(([key, label]) => `
    <div><h3>${label}</h3><table><tbody>${nutrients.filter(([field]) => nutrition[key][field] != null).map(([field, name, unit]) =>
      `<tr><th scope="row">${name}</th><td>${escapeHtml(nutrition[key][field])} ${unit}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`;
}

quantityIncrease?.addEventListener("click", () => {
  currentQuantity = Math.min(99, currentQuantity + 1);
quantityValue.value = currentQuantity;
});

quantityValue?.addEventListener("change", () => {
  currentQuantity = Math.max(1, Math.min(99, Number(quantityValue.value) || 1));
  quantityValue.value = currentQuantity;
});

quantityDecrease?.addEventListener("click", () => {
  if (currentQuantity > 1) {
    currentQuantity -= 1;
    quantityValue.value = currentQuantity;
  }
});

addToBagButton?.addEventListener("click", async () => {
  if (!product) return;

  try {
    if (addToCartError) addToCartError.textContent = "";
    addToBagButton.disabled = true;
    await addToCart(productId, currentQuantity, selectedVariant?.id || null);

    showAddedToBasket(addToBagButton);

    openCart({
      autoClose: true,
    });
  } catch (error) {
    console.error("Failed to add product:", error);
    if (addToCartError) addToCartError.textContent = error.message || "We could not add this cake to your basket. Please try again.";
  } finally {
    if (addToBagButton) addToBagButton.disabled = !(product?.stockQuantity > 0);
  }
});

function showError(message) {
  if (!productContainer) return;
  productContainer.setAttribute("aria-busy", "false");
  productContainer.innerHTML = `<div class="product-error"><h2>${message}</h2></div>`;
}

// INIT
document.addEventListener("DOMContentLoaded", loadProduct);

const relatedProductsContainer = document.querySelector("#related-products");

if (productId) {
  await loadProducts({
    container: relatedProductsContainer,
    loader: () => getRelatedProducts(productId),
    carousel: true,
  });
}
