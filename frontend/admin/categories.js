import { escapeHtml } from "../js/utils.js";
import { showToast } from "./toast.js";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./api/categoriesApi.js";

const categoriesBody = document.querySelector("#categories-body");

const categoryForm = document.querySelector("#category-form");

const categoryModal = document.querySelector("#category-modal");

const categoryModalClose = document.querySelector("#category-modal-close");

const categoryModalTitle = document.querySelector("#category-modal-title");

const categoryIdInput = document.querySelector("#category-id");

const categoryNameInput = document.querySelector("#category-name");

const categorySlugInput = document.querySelector("#category-slug");

const addCategoryButton = document.querySelector("#add-category-button");

const deleteModal = document.querySelector("#delete-modal");

const confirmDeleteButton = document.querySelector("#confirm-delete");

const cancelDeleteButton = document.querySelector("#cancel-delete");

const categorySearch = document.querySelector("#category-search");

let categoryToDelete = null;

let allCategories = [];

export async function loadCategories() {
  try {
    allCategories = await getCategories();

    renderCategories(allCategories);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderCategories(categories) {
  if (categories.length === 0) {
    categoriesBody.innerHTML = `
      <tr>
        <td colspan="3">
          No categories found.
        </td>
      </tr>
    `;

    return;
  }

  categoriesBody.innerHTML = categories
    .map(
      (category) => `
        <tr>

          <td>${escapeHtml(category.name)}</td>

          <td>${escapeHtml(category.slug)}</td>

          <td>

            <button
              class="edit-category"
              data-id="${category.id}"
            >
              Edit
            </button>

            <button
              class="delete-category"
              data-id="${category.id}"
            >
              Delete
            </button>

          </td>

        </tr>
      `,
    )
    .join("");
}

function openCategoryModal() {
  categoryModal.hidden = false;
}

function closeCategoryModal() {
  categoryModal.hidden = true;

  categoryForm.reset();

  categoryIdInput.value = "";

  categoryModalTitle.textContent = "Add Category";
}

categoryModalClose.addEventListener("click", closeCategoryModal);

addCategoryButton.addEventListener("click", () => {
  categoryForm.reset();

  categoryIdInput.value = "";

  categoryModalTitle.textContent = "Add Category";

  openCategoryModal();
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const category = {
    name: categoryNameInput.value.trim(),
    slug: categorySlugInput.value.trim(),
  };

  try {
    if (categoryIdInput.value) {
      await updateCategory(Number(categoryIdInput.value), category);

      showToast("Category updated successfully.");
    } else {
      await createCategory(category);

      showToast("Category created successfully.");
    }

    closeCategoryModal();

    await loadCategories();
  } catch (error) {
    showToast(error.message, "error");
  }
});

categorySlugInput.value = categoryNameInput.value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !categoryModal.hidden) {
    closeCategoryModal();
  }
});

categoriesBody.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-category");

  if (editButton) {
    try {
      const category = await getCategory(Number(editButton.dataset.id));

      categoryIdInput.value = category.id;
      categoryNameInput.value = category.name;
      categorySlugInput.value = category.slug;

      categoryModalTitle.textContent = "Edit Category";

      openCategoryModal();
    } catch (error) {
      showToast(error.message, "error");
    }

    return;
  }

  const deleteButton = event.target.closest(".delete-category");

  if (!deleteButton) return;

  categoryToDelete = Number(deleteButton.dataset.id);

  deleteModal.hidden = false;
});

cancelDeleteButton.addEventListener("click", () => {
  deleteModal.hidden = true;

  categoryToDelete = null;
});

confirmDeleteButton.addEventListener("click", async () => {
  if (!categoryToDelete) return;

  try {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";

    await deleteCategory(categoryToDelete);

    showToast("Category deleted successfully.");

    deleteModal.hidden = true;

    categoryToDelete = null;

    await loadCategories();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Delete";
  }
});

categorySearch?.addEventListener("input", () => {
  const search = categorySearch.value.trim().toLowerCase();

  const filteredCategories = allCategories.filter((category) =>
    category.name.toLowerCase().includes(search),
  );

  renderCategories(filteredCategories);
});
