export const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatPrice(priceInPence) {
  return currency.format(priceInPence / 100);
}

export function calculateDiscountPercentage(priceInPence, oldPriceInPence) {
  return Math.round(((oldPriceInPence - priceInPence) / oldPriceInPence) * 100);
}

export function getProductIdFromUrl() {
  const lastSegment = window.location.pathname.split("/").pop();
  const productId = Number(lastSegment);
  return Number.isInteger(productId) ? productId : null;
}

export function createSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Escape a value before interpolating it into an `innerHTML` template.
// Anything that ends up in HTML and isn't a hardcoded string in our own
// source (product names, customer details, admin notes, etc.) should be
// passed through this first.
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
