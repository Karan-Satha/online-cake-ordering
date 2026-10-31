const STORAGE_KEY = "homeCake";
const DAY_MS = 24 * 60 * 60 * 1000;

function unwrap(value) {
  return value && typeof value === "object" && Object.hasOwn(value, "value") && Object.hasOwn(value, "expiresAt")
    ? value.value
    : value;
}

function getStore() {
  let source = {};
  try {
    source = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {}

  const store = {
    products: { cart: [], viewed: [], ...(source.products || {}) },
    user: { ...(source.user || {}) },
    overlays: { ...(unwrap(source.overlays) || {}) },
  };

  // Migrate the previous flat storage layout as it is read.
  for (const [key, raw] of Object.entries(source)) {
    if (["products", "user", "overlays"].includes(key)) continue;
    const value = unwrap(raw);
    if (key === "basketProducts") store.products.cart = value || [];
    else if (key === "viewedProducts") store.products.viewed = value || [];
    else if (key === "welcomeVoucherShown") store.overlays.welcomeVoucherShown = Boolean(value);
    else store.user[key] = value;
  }
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function locationFor(key) {
  if (key === "basketProducts") return ["products", "cart"];
  if (key === "viewedProducts") return ["products", "viewed"];
  if (key === "welcomeVoucherShown") return ["overlays", key];
  if (key === "overlays") return [null, null];
  return ["user", key];
}

export function setStorageItem(key, value, expiryDays = null) {
  const store = getStore();
  if (key === "overlays") {
    store.overlays = { ...store.overlays, ...(value || {}) };
  } else {
    const [section, property] = locationFor(key);
    store[section][property] = value;
  }
  saveStore(store);
}

export function updateUserData(values) {
  const store = getStore();
  store.user = { ...store.user, ...values };
  saveStore(store);
}

export function getStorageItem(key) {
  const store = getStore();
  if (key === "overlays") return store.overlays;
  const [section, property] = locationFor(key);
  return store[section]?.[property] ?? null;
}

export function removeStorageItem(key) {
  const store = getStore();
  const [section, property] = locationFor(key);
  if (key === "overlays") store.overlays = { welcomeVoucherShown: false };
  else delete store[section][property];
  saveStore(store);
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function initialiseProfile() {
  const profile = getStorageItem("customerProfile");
  const now = Date.now();
  if (profile) {
    profile.visits = (profile.visits || 0) + 1;
    profile.lastVisitAt = now;
    setStorageItem("customerProfile", profile);
    return;
  }
  setStorageItem("customerProfile", { visits: 1, firstVisitAt: now, lastVisitAt: now });
}

export function getCustomerProfile() {
  return getStorageItem("customerProfile") || { visits: 1 };
}

export function hasOverlayExpired() {
  const overlays = getStorageItem("overlays") || {};
  return !overlays.suppressionExpiresAt || Date.now() >= overlays.suppressionExpiresAt;
}

export function markOverlayShown(overlayName, hours = 24) {
  const overlays = getStorageItem("overlays") || {};
  overlays[overlayName] = { shownAt: Date.now() };
  overlays.suppressionExpiresAt = Date.now() + hours * 60 * 60 * 1000;
  setStorageItem("overlays", overlays);
}

export const OVERLAY_SUPPRESSION_MS = DAY_MS;
