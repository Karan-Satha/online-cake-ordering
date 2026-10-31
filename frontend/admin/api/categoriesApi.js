import { adminRequest } from "./http.js";

export function getCategories() {
  return adminRequest("/categories");
}

export function getCategory(categoryId) {
  return adminRequest(`/categories/${categoryId}`);
}

export function createCategory(category) {
  return adminRequest("/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
}

export function updateCategory(categoryId, category) {
  return adminRequest(`/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
}

export function deleteCategory(categoryId) {
  return adminRequest(`/categories/${categoryId}`, {
    method: "DELETE",
  });
}
