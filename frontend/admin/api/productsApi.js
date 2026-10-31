import { adminRequest } from "./http.js";

export function getProducts() {
  return adminRequest("/products");
}

export function getProduct(productId) {
  return adminRequest(`/products/${productId}`);
}

export function createProduct(formData) {
  return adminRequest("/products", {
    method: "POST",
    body: formData,
  });
}

export function updateProduct(productId, formData) {
  return adminRequest(`/products/${productId}`, {
    method: "PATCH",
    body: formData,
  });
}

export function deleteProduct(productId) {
  return adminRequest(`/products/${productId}`, {
    method: "DELETE",
  });
}
