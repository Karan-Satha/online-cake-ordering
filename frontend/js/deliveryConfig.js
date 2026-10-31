// Mirrors the backend's DELIVERY_FEE_IN_PENCE / FREE_DELIVERY_THRESHOLD_IN_PENCE
// in backend/services/shop/checkoutService.js. The backend is the source of
// truth for what a customer is actually charged — these are only used here
// to show an estimate in the mini-cart and checkout summary before the
// Stripe session is created.
export const DELIVERY_FEE_IN_PENCE = 500;
export const FREE_DELIVERY_THRESHOLD_IN_PENCE = 5000;

export function getDeliveryFeeInPence(subtotalInPence) {
  return subtotalInPence > 0 && subtotalInPence < FREE_DELIVERY_THRESHOLD_IN_PENCE ? DELIVERY_FEE_IN_PENCE : 0;
}

export function getFreeDeliveryMessage(subtotalInPence, formatPrice) {
  if (subtotalInPence <= 0) {
    return "Add cakes to your basket to checkout.";
  }

  const remaining = FREE_DELIVERY_THRESHOLD_IN_PENCE - subtotalInPence;

  return remaining > 0 ? `Spend ${formatPrice(remaining)} more for free delivery.` : "You qualify for free delivery.";
}
