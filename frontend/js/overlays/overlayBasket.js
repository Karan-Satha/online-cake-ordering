import { getStorageItem, setStorageItem } from "./overlayStorage.js";

export function syncBasketProducts(cartItems = []) {
  const basket = cartItems.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    description: item.description || "",
    priceInPence: item.priceInPence,
    oldPriceInPence: item.oldPriceInPence || null,
    quantity: item.quantity || 1,
    addedAt: Date.now(),
  }));

  setStorageItem("basketProducts", basket);
}

export function getBasketProducts() {
  return getStorageItem("basketProducts") || [];
}

export function getBasketTotal() {
  const basket = getBasketProducts();
  return basket.reduce((total, item) => total + item.priceInPence * (item.quantity || 1), 0);
}

export function getBasketItemCount() {
  const basket = getBasketProducts();
  return basket.reduce((count, item) => count + (item.quantity || 1), 0);
}
