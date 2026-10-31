import { getVoucher } from "./api.js";
import { getStorageItem, setStorageItem, removeStorageItem } from "./overlays/overlayStorage.js";

const STORAGE_KEY = "hc-pending-voucher-code";

export function storePendingVoucher(code) {
  setStorageItem("voucher", {
    code,
  });
}

export function getPendingVoucherCode() {
  const voucher = getStorageItem("voucher");
  return voucher?.code || null;
}

export function clearPendingVoucher() {
  removeStorageItem("voucher");
}

/**
 * Checks for a locally-stored voucher code and, if it's still valid,
 * returns the discount to apply to the given subtotal. Used to
 * auto-apply the welcome-overlay code on the mini-cart and checkout page
 * without the customer typing anything in.
 *
 * A stale/invalid code (expired, deactivated) is cleared silently and
 * treated as "no discount" — this runs in the background on every cart
 * view, so it should never surface an error to someone who isn't even
 * trying to use a code right now.
 */
export async function getAutoAppliedDiscount(subtotalInPence) {
  const code = getPendingVoucherCode();

  if (!code || subtotalInPence <= 0) {
    if (subtotalInPence <= 0) removeStorageItem("appliedVoucher");
    return { code: null, discountPercent: 0, discountInPence: 0 };
  }

  try {
    const voucher = await getVoucher(code);

    const discountInPence = Math.round((subtotalInPence * voucher.discountPercent) / 100);

    setStorageItem("appliedVoucher", {
      code: voucher.code,
      discountPercent: voucher.discountPercent,
    });

    setStorageItem("voucher", {
      code: voucher.code,
      discountPercent: voucher.discountPercent,
    });

    return {
      code: voucher.code,
      discountPercent: voucher.discountPercent,
      discountInPence,
    };
  } catch (error) {
    clearPendingVoucher();

    removeStorageItem("appliedVoucher");

    return {
      code: null,
      discountPercent: 0,
      discountInPence: 0,
    };
  }
}
