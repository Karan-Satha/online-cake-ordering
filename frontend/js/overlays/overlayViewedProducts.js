import { getStorageItem, setStorageItem } from "./overlayStorage.js";

const STORAGE_KEY = "viewedProducts";

export function trackViewedProduct(product) {
  if (!product?.id) {
    return;
  }

  const viewedProducts = getStorageItem(STORAGE_KEY) || [];

  const filteredProducts = viewedProducts.filter((item) => item.id !== product.id);

  filteredProducts.push({
    id: product.id,
    name: product.name,
    image: product.image,
    description: product.description || "",
    priceInPence: product.priceInPence,
    oldPriceInPence: product.oldPriceInPence || null,
    viewedAt: Date.now(),
  });

  setStorageItem(STORAGE_KEY, filteredProducts.slice(-10), 30);
}

export function getViewedProducts() {
  return getStorageItem(STORAGE_KEY) || [];
}

export function getExitIntentProducts() {
  const viewedProducts = getViewedProducts();

  return viewedProducts.slice(-2);
}
