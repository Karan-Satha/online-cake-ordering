import { API_URL } from "./config.js";
import { createHttpClient } from "./http.js";

const request = createHttpClient(API_URL);

// ======================================================
// PRODUCTS
// ======================================================

export function getProducts({ search = "", category = "", sort = "" } = {}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (category) {
    params.set("category", category);
  }

  if (sort) {
    params.set("sort", sort);
  }

  const query = params.toString();

  return request(`/products${query ? `?${query}` : ""}`);
}

export function getFeaturedProducts() {
  return request("/products/featured");
}

export function getRelatedProducts(productId) {
  return request(`/products/${productId}/related`);
}

export function getProduct(productId) {
  return request(`/products/${productId}`);
}

export function trackVisitorPageView() {
  return request("/analytics/session", { method: "POST" });
}

// ======================================================
// CATEGORIES
// ======================================================

export function getCategories() {
  return request("/products/categories");
}

// ======================================================
// CART
// ======================================================

export function getCart() {
  return request("/cart");
}

function notifyBasketUpdated(cart, action) {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("basket:updated", { detail: { cart, action } }));
  }
  return cart;
}

export function addToCart(productId, quantity = 1, variantId = null) {
  return request("/cart/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      quantity,
      ...(variantId ? { variantId } : {}),
    }),
  }).then((cart) => notifyBasketUpdated(cart, "add"));
}

export function updateCartItem(cartItemId, quantity) {
  return request(`/cart/items/${cartItemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quantity,
    }),
  }).then((cart) => notifyBasketUpdated(cart, "update"));
}

export function removeCartItem(cartItemId) {
  return request(`/cart/items/${cartItemId}`, {
    method: "DELETE",
  }).then((cart) => notifyBasketUpdated(cart, "remove"));
}

// ======================================================
// CHECKOUT
// ======================================================

export function createCheckoutSession(order) {
  return request("/checkout/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
}

export function completeCheckout(sessionId) {
  return request("/checkout/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

// ======================================================
// AI IMAGE
// ======================================================

export function generateCakePreview(data) {
  return request("/custom-cakes/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// ======================================================
// CUSTOM CAKE REQUEST
// ======================================================

export function submitCustomCake(formData) {
  return request("/custom-cakes", {
    method: "POST",
    body: formData,
  });
}

// ======================================================
// NEWSLETTER
// ======================================================

export function subscribeToNewsletter(email) {
  return request("/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

// ======================================================
// CUSTOMER ACCOUNT
// ======================================================

export function registerCustomer({ name, email, password }) {
  return request("/customers/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export function loginCustomer({ email, password }) {
  return request("/customers/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function logoutCustomer() {
  return request("/customers/logout", { method: "POST" });
}

export function getCurrentCustomer() {
  return request("/customers/me");
}

export function requestPasswordReset(email) {
  return request("/customers/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ token, password }) {
  return request("/customers/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

export function getMyOrders() {
  return request("/customers/orders");
}

// ======================================================
// VOUCHERS
// ======================================================

export function getVoucher(code) {
  return request(`/vouchers/${encodeURIComponent(code)}`);
}
