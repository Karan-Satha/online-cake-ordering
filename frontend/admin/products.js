import { BASE_URL, assetUrl } from "../js/config.js";
import { escapeHtml, formatPrice } from "../js/utils.js";
import { showToast } from "./toast.js";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./api/productsApi.js";
import { getCategories } from "./api/categoriesApi.js";

let allProducts = [];
let allCategories = [];

// ======================================================
// DOM
// ======================================================

const productsBody = document.querySelector("#products-body");

const productModal = document.querySelector("#product-modal");
const productModalClose = document.querySelector("#product-modal-close");
const productModalCancel = document.querySelector("#product-modal-cancel");

const productForm = document.querySelector("#product-form");

const productIdInput = document.querySelector("#product-id");
const productNameInput = document.querySelector("#product-name");
const productPriceInput = document.querySelector("#product-price");
const productOldPriceInput = document.querySelector("#product-old-price");
const productStockInput = document.querySelector("#product-stock");
const productImageInput = document.querySelector("#product-image");

const deleteModal = document.querySelector("#delete-modal");

const confirmDeleteButton = document.querySelector("#confirm-delete");

const cancelDeleteButton = document.querySelector("#cancel-delete");

const addProductButton = document.querySelector("#add-product-button");

const productModalTitle = document.querySelector("#product-modal-title");
const productSearch = document.querySelector("#product-search");

const currentImageInput = document.querySelector("#current-image");
const imagePreview = document.querySelector("#image-preview");
const productCategoryInput = document.querySelector("#product-category");
const productDescriptionInput = document.querySelector("#product-description");
const productIngredientsInput = document.querySelector("#product-ingredients");
const productAllergensInput = document.querySelector("#product-allergens");
const productAllergyAdviceInput = document.querySelector("#product-allergy-advice");
const productStorageInput = document.querySelector("#product-storage");
const productShelfLifeInput = document.querySelector("#product-shelf-life");
const productNutritionGrids = [...document.querySelectorAll("[data-nutrition-grid]")];
const productVariantsContainer = document.querySelector("#product-variants");
const addProductVariantButton = document.querySelector("#add-product-variant");
const productGalleryInput = document.querySelector("#product-gallery");
const productGalleryList = document.querySelector("#product-gallery-list");
let existingGallery = [];
let newGalleryFiles = [];

const nutritionFields = [
  ["energyKcal", "Energy", "kcal"], ["energyKj", "Energy", "kJ"], ["fat", "Fat", "g"],
  ["saturates", "Saturates", "g"], ["carbohydrates", "Carbohydrates", "g"],
  ["sugars", "Sugars", "g"], ["protein", "Protein", "g"], ["salt", "Salt", "g"],
];

productNutritionGrids.forEach((grid) => {
  const basis = grid.dataset.nutritionGrid;
  grid.insertAdjacentHTML("beforeend", nutritionFields.map(([key, label, unit]) => {
    const id = `nutrition-${basis}-${key}`;
    return `<label for="${id}">${label} (${unit})<input id="${id}" type="number" min="0" step="any" data-nutrition-basis="${basis}" data-nutrition-key="${key}" /></label>`;
  }).join(""));
});

function createVariantRow(variant = {}) {
  const row = document.createElement("fieldset");
  row.className = "product-variant-row";
  row.innerHTML = `
    <legend>Size option</legend>
    <label>Size name<input type="text" data-variant-field="name" maxlength="100" value="${escapeHtml(variant.name || "")}" required></label>
    <label>Servings<input type="number" data-variant-field="servings" min="1" step="1" value="${variant.servings || ""}" placeholder="Optional" /></label>
    <label>Price (£)<input type="number" data-variant-field="price" min="0" step="0.01" value="${variant.priceInPence != null ? (variant.priceInPence / 100).toFixed(2) : ""}" required /></label>
    <label>Size details<input type="text" data-variant-field="details" maxlength="2000" value="${escapeHtml(variant.details || "")}" placeholder="Optional" /></label>
    <button type="button" class="remove-variant secondary-action">Remove size</button>
    <input type="hidden" data-variant-field="id" value="${variant.id || ""}" />
  `;
  row.querySelector(".remove-variant").addEventListener("click", () => row.remove());
  productVariantsContainer.appendChild(row);
}

addProductVariantButton.addEventListener("click", () => createVariantRow());

productGalleryInput.addEventListener("change", () => {
  const availableSlots = Math.max(0, 8 - existingGallery.length - newGalleryFiles.length);
  const files = [...productGalleryInput.files];
  files.slice(0, availableSlots).forEach((file) => {
    newGalleryFiles.push({ file, url: URL.createObjectURL(file) });
  });
  productGalleryInput.value = "";
  renderGalleryList();
  if (files.length > availableSlots) {
    showToast("A product can have up to 8 additional images.", "error");
  }
});

function renderNutrition(nutrition = {}) {
  for (const basis of ["per100g", "perPortion"]) {
    const values = nutrition?.[basis] || {};
    productNutritionGrids.find((grid) => grid.dataset.nutritionGrid === basis)
      .querySelectorAll("[data-nutrition-key]").forEach((input) => {
        input.value = values[input.dataset.nutritionKey] ?? "";
      });
  }
}

function collectNutrition() {
  const nutrition = {};
  for (const basis of ["per100g", "perPortion"]) {
    const values = {};
    productNutritionGrids.find((grid) => grid.dataset.nutritionGrid === basis)
      .querySelectorAll("[data-nutrition-key]").forEach((input) => {
        if (input.value !== "") values[input.dataset.nutritionKey] = Number(input.value);
      });
    if (Object.keys(values).length) nutrition[basis] = values;
  }
  return Object.keys(nutrition).length ? nutrition : null;
}

function collectVariants() {
  return [...productVariantsContainer.querySelectorAll(".product-variant-row")].map((row) => {
    const get = (key) => row.querySelector(`[data-variant-field="${key}"]`).value;
    return {
      id: get("id") || null,
      name: get("name").trim(),
      servings: get("servings") || null,
      priceInPence: Math.round(Number(get("price")) * 100),
      details: get("details").trim(),
    };
  });
}

function renderGalleryList() {
  const savedImages = existingGallery.map((path, index) => ({
    name: path.split("/").pop(),
    src: /^https?:\/\//i.test(path) ? assetUrl(path) : assetUrl(`/uploads/products/${path}`),
    source: "saved",
    index,
  }));
  const addedImages = newGalleryFiles.map(({ file, url }, index) => ({
    name: file.name,
    src: url,
    source: "new",
    index,
  }));
  const images = [...savedImages, ...addedImages];
  productGalleryList.innerHTML = images.length
    ? images.map((image) => `<span><img src="${escapeHtml(image.src)}" alt="" /><span>${escapeHtml(image.name)}</span><button type="button" data-gallery-source="${image.source}" data-gallery-index="${image.index}" aria-label="Remove ${escapeHtml(image.name)} from gallery">Remove</button></span>`).join("")
    : "<span>No additional gallery images selected.</span>";
  productGalleryList.querySelectorAll("[data-gallery-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.galleryIndex);
      if (button.dataset.gallerySource === "saved") {
        existingGallery.splice(index, 1);
      } else {
        URL.revokeObjectURL(newGalleryFiles[index].url);
        newGalleryFiles.splice(index, 1);
      }
      renderGalleryList();
    });
  });
  productGalleryInput.disabled = images.length >= 8;
  productGalleryInput.title = productGalleryInput.disabled ? "A product can have up to 8 additional images" : "";
}

function resetProductExtras() {
  productDescriptionInput.value = "";
  productIngredientsInput.value = "";
  productAllergensInput.value = "";
  productAllergyAdviceInput.value = "";
  productStorageInput.value = "";
  productShelfLifeInput.value = "";
  renderNutrition();
  productVariantsContainer.innerHTML = "";
  existingGallery = [];
  newGalleryFiles.forEach(({ url }) => URL.revokeObjectURL(url));
  newGalleryFiles = [];
  productGalleryInput.value = "";
  renderGalleryList();
}

let productToDelete = null;

// ======================================================
// LOAD
// ======================================================

export async function loadProducts() {
  try {
    allProducts = await getProducts();
    renderProducts(allProducts);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadCategoryOptions(selectedCategoryId = "") {
  try {
    if (allCategories.length === 0) {
      allCategories = await getCategories();
    }

    productCategoryInput.innerHTML = `
      <option value="">Select Category</option>

      ${allCategories
        .map(
          (category) => `
            <option
              value="${category.id}"
              ${
                Number(selectedCategoryId) === Number(category.id)
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(category.name)}
            </option>
          `,
        )
        .join("")}
    `;
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ======================================================
// RENDER
// ======================================================

function renderProducts(products) {
  if (products.length === 0) {
    productsBody.innerHTML = `
      <tr>
        <td colspan="5">
          No products found.
        </td>
      </tr>
    `;

    return;
  }

  productsBody.innerHTML = products
    .map((product) => {
      const name = escapeHtml(product.name);

      return `
        <tr>
          <td>
            <img
              src="${escapeHtml(assetUrl(product.image))}"
              alt="${name}"
              width="60"
            />
          </td>
          <td>${name}</td>
          <td>${escapeHtml(product.categoryName ?? "-")}</td>
          <td>${formatPrice(product.priceInPence)}</td>
          <td>
            <button
              class="edit-product"
              data-id="${product.id}"
            >
              Edit
            </button>

            <button
              class="delete-product"
              data-id="${product.id}"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ======================================================
// MODAL
// ======================================================

function openProductModal() {
  productModal.hidden = false;
  document.body.classList.add("product-modal-open");
  productModalClose.focus();
}

function closeProductModal() {
  productModal.hidden = true;
  document.body.classList.remove("product-modal-open");

  productForm.reset();

  productIdInput.value = "";

  currentImageInput.value = "";

  productImageInput.value = "";
  productImageInput.required = false;

  imagePreview.hidden = true;

  imagePreview.removeAttribute("src");
  productCategoryInput.value = "";
  resetProductExtras();
}

productModalClose.addEventListener("click", closeProductModal);
productModalCancel.addEventListener("click", closeProductModal);

addProductButton.addEventListener("click", async () => {
  productForm.reset();
  resetProductExtras();

  productIdInput.value = "";

  productModalTitle.textContent = "Add Product";
  currentImageInput.value = "";

  productImageInput.value = "";
  productImageInput.required = true;

  imagePreview.hidden = true;

  imagePreview.removeAttribute("src");

  await loadCategoryOptions();
  openProductModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productModal.hidden) {
    closeProductModal();
  }
});

// ======================================================
// CREATE / UPDATE
// ======================================================

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData();

  formData.append("name", productNameInput.value.trim());

  formData.append(
    "priceInPence",
    Math.round(Number(productPriceInput.value) * 100),
  );

  formData.append("oldPriceInPence", productOldPriceInput.value === "" ? "" : Math.round(Number(productOldPriceInput.value) * 100));
  formData.append("stockQuantity", productStockInput.value);

  formData.append("categoryId", productCategoryInput.value);
  formData.append("description", productDescriptionInput.value.trim());
  formData.append("ingredients", productIngredientsInput.value.trim());
  formData.append("allergens", productAllergensInput.value.trim());
  formData.append("allergyAdvice", productAllergyAdviceInput.value.trim());
  formData.append("storageInstructions", productStorageInput.value.trim());
  formData.append("shelfLife", productShelfLifeInput.value.trim());
  formData.append("nutrition", JSON.stringify(collectNutrition() || {}));
  formData.append("variants", JSON.stringify(collectVariants()));
  formData.append("imageGallery", JSON.stringify(existingGallery));

  if (productImageInput.files.length > 0) {
    formData.append("image", productImageInput.files[0]);
  } else if (currentImageInput.value) {
    formData.append(
      "image",
      currentImageInput.value.replace("/uploads/products/", ""),
    );
  }

  newGalleryFiles.forEach(({ file }) => formData.append("galleryImages", file));

  try {
    if (productIdInput.value) {
      await updateProduct(Number(productIdInput.value), formData);

      showToast("Product updated successfully.");
    } else {
      await createProduct(formData);

      showToast("Product created successfully.");
    }

    closeProductModal();

    await loadProducts();
  } catch (error) {
    showToast(error.message, "error");
  }
});

// ======================================================
// EDIT / DELETE
// ======================================================

productsBody.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-product");

  if (editButton) {
    try {
      const product = await getProduct(Number(editButton.dataset.id));

      currentImageInput.value = product.image;
      imagePreview.src = assetUrl(product.image);
      imagePreview.hidden = false;
      productIdInput.value = product.id;
      productNameInput.value = product.name;
      productPriceInput.value = (product.priceInPence / 100).toFixed(2);
      productOldPriceInput.value = product.oldPriceInPence == null ? "" : (product.oldPriceInPence / 100).toFixed(2);
      productStockInput.value = product.stockQuantity ?? 0;
      productDescriptionInput.value = product.description || "";
      productIngredientsInput.value = product.ingredients || "";
      productAllergensInput.value = product.allergens || "";
      productAllergyAdviceInput.value = product.allergyAdvice || "";
      productStorageInput.value = product.storageInstructions || "";
      productShelfLifeInput.value = product.shelfLife || "";
      renderNutrition(product.nutrition || {});
      productVariantsContainer.innerHTML = "";
      product.variants?.forEach(createVariantRow);
      existingGallery = (product.imageGallery || []).map((path) => path.replace(/^\/uploads\/products\//, ""));
      newGalleryFiles.forEach(({ url }) => URL.revokeObjectURL(url));
      newGalleryFiles = [];
      renderGalleryList();
      productGalleryInput.value = "";
      await loadCategoryOptions(product.categoryId);
      productImageInput.value = "";
      productImageInput.required = false;
      productModalTitle.textContent = "Edit Product";

      openProductModal();
    } catch (error) {
      showToast(error.message, "error");
    }

    return;
  }

  const deleteButton = event.target.closest(".delete-product");

  if (!deleteButton) return;

  productToDelete = Number(deleteButton.dataset.id);

  deleteModal.hidden = false;
});

cancelDeleteButton.addEventListener("click", () => {
  deleteModal.hidden = true;

  productToDelete = null;
});

confirmDeleteButton.addEventListener("click", async () => {
  if (!productToDelete) return;

  try {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";

    await deleteProduct(productToDelete);

    showToast("Product deleted successfully.");

    await loadProducts();

    deleteModal.hidden = true;

    productToDelete = null;
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Delete Product";
  }
});

// ======================================================
// SEARCH / IMAGE PREVIEW
// ======================================================

productSearch.addEventListener("input", () => {
  const search = productSearch.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    return (
      product.name.toLowerCase().includes(search) ||
      (product.categoryName ?? "").toLowerCase().includes(search)
    );
  });

  renderProducts(filteredProducts);
});

productImageInput.addEventListener("change", () => {
  const file = productImageInput.files[0];

  if (!file) return;

  imagePreview.src = URL.createObjectURL(file);

  imagePreview.hidden = false;
});
