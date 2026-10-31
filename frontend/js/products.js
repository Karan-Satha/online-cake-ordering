import { getProducts, getCategories } from "./api.js";
import { createProductCard } from "./productCard.js";
import { escapeHtml } from "./utils.js";

const productList = document.querySelector("#product-list");
const categoryList = document.querySelector("#category-list");
const productSearch = document.querySelector("#product-search");
const productSort = document.querySelector("#product-sort");
const resultsCount = document.querySelector("#results-count");
const productsTitle = document.querySelector("#products-title");
const collectionTitle = document.querySelector("#collection-title");
const clearFilters = document.querySelector("#clear-filters");
const pagination = document.querySelector("#pagination");

const categorySlug = window.location.pathname.split("/")[2];

let selectedCategory = categorySlug === "all" ? "" : categorySlug;

let search = "";
let sort = "";

// 4 columns × 3 rows on the default desktop grid. The grid reflows to
// fewer columns on smaller screens, so this won't always be exactly 3
// visual rows there, but it keeps one consistent, predictable page size
// everywhere rather than a different one per breakpoint.
const PAGE_SIZE = 12;

let allProducts = [];
let currentPage = 1;

export function renderProducts(products) {
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = `<li class="empty-products">No products found.</li>`;
    return;
  }

  productList.innerHTML = "";
  products.forEach((product) => productList.append(createProductCard(product)));
}

function renderPagination(totalItems) {
  if (!pagination) return;

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  if (totalPages <= 1) {
    pagination.hidden = true;
    pagination.innerHTML = "";
    return;
  }

  pagination.hidden = false;

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map(
      (page) => `
        <button
          class="pagination__page ${page === currentPage ? "active" : ""}"
          data-page="${page}"
          type="button"
          ${page === currentPage ? 'aria-current="page"' : ""}
        >${page}</button>
      `,
    )
    .join("");

  pagination.innerHTML = `
    <button class="pagination__nav" data-page="${currentPage - 1}" type="button" ${currentPage === 1 ? "disabled" : ""}>
      Prev
    </button>
    ${pageButtons}
    <button class="pagination__nav" data-page="${currentPage + 1}" type="button" ${currentPage === totalPages ? "disabled" : ""}>
      Next
    </button>
  `;
}

function renderCurrentPage() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allProducts.slice(start, start + PAGE_SIZE);

  renderProducts(pageItems);
  renderPagination(allProducts.length);

  if (resultsCount) {
    resultsCount.textContent = `${allProducts.length} ${allProducts.length === 1 ? "cake" : "cakes"}`;
  }
}

pagination?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");

  if (!button || button.disabled) return;

  const page = Number(button.dataset.page);
  const totalPages = Math.ceil(allProducts.length / PAGE_SIZE);

  if (!page || page < 1 || page > totalPages || page === currentPage) return;

  currentPage = page;
  renderCurrentPage();
  document.querySelector("#products")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

export async function loadProducts() {
  try {
    const products = await getProducts({
      category: selectedCategory,
      search,
      sort,
    });

    allProducts = products;
    currentPage = 1;
    renderCurrentPage();
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

function renderCategories(categories) {
  if (!categoryList) return;

  categoryList.innerHTML = `
    <button
      class="category-button ${selectedCategory === "" ? "active" : ""}"
      data-slug=""
      type="button"
    >
      All
    </button>

    ${categories
      .map(
        (category) => `
          <button
            class="category-button ${selectedCategory === category.slug ? "active" : ""}"
            data-slug="${escapeHtml(category.slug)}"
            type="button"
          >
            ${escapeHtml(category.name)}
          </button>
        `,
      )
      .join("")}
  `;
}

async function loadCategories() {
  try {
    const categories = await getCategories();
    renderCategories(categories);
    updateFilterSummary();
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

function updateFilterSummary() {
  const hasFilters = Boolean(selectedCategory || search || sort);
  const selectedCategoryName = selectedCategory
    ? [...(categoryList?.querySelectorAll(".category-button") || [])]
      .find((button) => button.dataset.slug === selectedCategory)?.textContent.trim()
    : "Cakes";

  if (collectionTitle) {
    collectionTitle.textContent = selectedCategoryName || "Cakes";
  }

  if (clearFilters) {
    clearFilters.hidden = !hasFilters;
  }

  if (productsTitle) {
    productsTitle.textContent = selectedCategory
      ? [...(categoryList?.querySelectorAll(".category-button") || [])]
        .find((button) => button.dataset.slug === selectedCategory)?.textContent.trim() || "Our cakes"
      : "All cakes";
  }
}

categoryList?.addEventListener("click", async (event) => {
  const button = event.target.closest(".category-button");
  if (!button) return;

  selectedCategory = button.dataset.slug;
  await loadCategories();
  updateFilterSummary();
  await loadProducts();
});

productSearch?.addEventListener("input", async (event) => {
  search = event.target.value.trim();
  updateFilterSummary();
  await loadProducts();
});

productSort?.addEventListener("change", async (event) => {
  sort = event.target.value;
  updateFilterSummary();
  await loadProducts();
});

clearFilters?.addEventListener("click", async () => {
  selectedCategory = "";
  search = "";
  sort = "";
  productSearch.value = "";
  productSort.value = "";
  await loadCategories();
  updateFilterSummary();
  await loadProducts();
});

// INIT
loadCategories();
updateFilterSummary();
loadProducts();
