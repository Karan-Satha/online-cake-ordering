import { BASE_URL } from "./config.js";
import { createCheckoutSession, getCart, removeCartItem, updateCartItem, getVoucher } from "./api.js";
import { escapeHtml, formatPrice } from "./utils.js";
import { getDeliveryFeeInPence, getFreeDeliveryMessage } from "./deliveryConfig.js";
import { getAutoAppliedDiscount, storePendingVoucher } from "./voucher.js";
import { createFormValidator, validators, showFieldError, showFieldSuccess, clearFieldError, initAlert } from "./formValidation.js";

const checkoutItems = document.querySelector("#checkout-items");
const subtotalElement = document.querySelector("#checkout-subtotal");
const discountRow = document.querySelector("#checkout-discount-row");
const discountLabelElement = document.querySelector("#checkout-discount-label");
const discountElement = document.querySelector("#checkout-discount");
const deliveryElement = document.querySelector("#checkout-delivery");
const totalElement = document.querySelector("#checkout-total");
const deliveryMessage = document.querySelector("#free-delivery-message");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutAlert = initAlert(document.querySelector("#checkout-error"));
const payButton = document.querySelector("#pay-button");
const voucherCodeInput = document.querySelector("#voucher-code-input");
const voucherApplyButton = document.querySelector("#voucher-apply-button");

// Every field a customer fills in before paying, validated the same way as
// every other form in the app: required checks plus format checks where it
// matters (email, phone, postcode).
const validator = createFormValidator(checkoutForm, {
  "#customer-name": [validators.required("Please enter your full name.")],
  "#customer-email": [validators.required("Please enter your email."), validators.email()],
  "#customer-phone": [
    validators.required("Please enter your phone number."),
    validators.phone("Enter a valid phone number."),
  ],
  "#delivery-address": [validators.required("Please enter your delivery address.")],
  "#delivery-city": [validators.required("Please enter your city.")],
  "#delivery-postcode": [
    validators.required("Please enter your postcode."),
    validators.postcode("Enter a valid postcode."),
  ],
});

let cart = [];
// Kept in sync with what's currently displayed, so the form submit sends
// exactly the code the customer can see applied — never a stale or
// re-fetched value that might differ from what's on screen.
let appliedDiscount = { code: null, discountInPence: 0 };

function getSubtotal() {
  return cart.reduce((total, item) => total + item.priceInPence * item.quantity, 0);
}

async function renderSummary() {
  const subtotal = getSubtotal();
  const delivery = getDeliveryFeeInPence(subtotal);

  appliedDiscount = await getAutoAppliedDiscount(subtotal);

  if (discountRow) {
    if (appliedDiscount.code) {
      discountRow.hidden = false;
      if (discountLabelElement) discountLabelElement.textContent = `Discount (${appliedDiscount.code})`;
      if (discountElement) discountElement.textContent = `−${formatPrice(appliedDiscount.discountInPence)}`;
    } else {
      discountRow.hidden = true;
    }
  }

  subtotalElement.textContent = formatPrice(subtotal);
  deliveryElement.textContent = delivery ? formatPrice(delivery) : "Free";
  totalElement.textContent = formatPrice(subtotal - appliedDiscount.discountInPence + delivery);
  deliveryMessage.textContent = getFreeDeliveryMessage(subtotal, formatPrice);

  // Reflect whatever's actually applied in the input too, so someone who
  // got here via the welcome-overlay code (rather than typing one in
  // manually) can still see which code is active and change it if they want.
  if (voucherCodeInput && appliedDiscount.code && document.activeElement !== voucherCodeInput) {
    voucherCodeInput.value = appliedDiscount.code;
  }
}

async function handleApplyVoucher() {
  const code = voucherCodeInput?.value.trim();

  if (!code) {
    showFieldError(voucherCodeInput, "Please enter a code.");
    return;
  }

  clearFieldError(voucherCodeInput);
  voucherApplyButton.disabled = true;
  voucherApplyButton.textContent = "Checking…";

  try {
    const voucher = await getVoucher(code);

    // Persisting it is what makes this the same "auto-applied" code
    // renderSummary() picks up — typing a code in here and having it
    // auto-apply on confirmation/future visits works exactly the same way
    // the welcome-overlay code does.
    storePendingVoucher(voucher.code);

    showFieldSuccess(voucherCodeInput, `"${voucher.code}" applied — ${voucher.discountPercent}% off!`);

    await renderSummary();
  } catch (error) {
    showFieldError(voucherCodeInput, "Invalid code. Please check and try again.");
  } finally {
    voucherApplyButton.disabled = false;
    voucherApplyButton.textContent = "Apply";
  }
}

voucherApplyButton?.addEventListener("click", handleApplyVoucher);

voucherCodeInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleApplyVoucher();
  }
});

function renderCart() {
  if (cart.length === 0) {
    checkoutItems.innerHTML =
      '<li class="checkout-empty">Your basket is empty. <a href="/shop/all">Browse cakes</a></li>';
    payButton.disabled = true;
    renderSummary();
    return;
  }

  payButton.disabled = false;
  checkoutItems.innerHTML = cart
    .map((item) => {
      const name = escapeHtml(item.variantName ? `${item.name} — ${item.variantName}` : item.name);

      return `
    <li class="checkout-item">
      <img src="${BASE_URL}${item.image}" alt="${name}" />
      <div><strong>${name}</strong><span>${formatPrice(item.priceInPence)}</span></div>
      <div class="checkout-item__controls">
        <button type="button" data-action="decrease" data-id="${item.cartItemId}" aria-label="Decrease ${name}">−</button>
        <span>${item.quantity}</span>
        <button type="button" data-action="increase" data-id="${item.cartItemId}" aria-label="Increase ${name}">+</button>
      </div>
      <button type="button" class="checkout-item__remove" data-action="remove" data-id="${item.cartItemId}" aria-label="Remove ${name}">Remove</button>
    </li>
  `;
    })
    .join("");
  renderSummary();
}

async function loadCheckout() {
  try {
    cart = await getCart();
    renderCart();
  } catch (error) {
    checkoutAlert.show("We could not load your basket. Please refresh and try again.");
  }
}

checkoutItems.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = cart.find((cartItem) => cartItem.cartItemId === Number(button.dataset.id));
  if (!item) return;

  try {
    if (button.dataset.action === "increase") {
      cart = await updateCartItem(item.cartItemId, item.quantity + 1);
    } else if (button.dataset.action === "decrease") {
      cart = item.quantity === 1 ? await removeCartItem(item.cartItemId) : await updateCartItem(item.cartItemId, item.quantity - 1);
    } else {
      cart = await removeCartItem(item.cartItemId);
    }
    renderCart();
  } catch (error) {
    checkoutAlert.show(error.message);
  }
});

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (cart.length === 0) return;

  if (!validator.validate()) return;

  const formData = {
    customerName: document.querySelector("#customer-name").value.trim(),
    customerEmail: document.querySelector("#customer-email").value.trim(),
    customerPhone: document.querySelector("#customer-phone").value.trim(),
    deliveryAddress: document.querySelector("#delivery-address").value.trim(),
    deliveryCity: document.querySelector("#delivery-city").value.trim(),
    deliveryPostcode: document.querySelector("#delivery-postcode").value.trim(),
    deliveryNotes: document.querySelector("#delivery-notes").value.trim(),
    marketingOptIn: document.querySelector("#marketing-opt-in").checked,
    discountCode: appliedDiscount.code,
  };

  checkoutAlert.hide();
  payButton.disabled = true;
  payButton.textContent = "Taking you to payment…";

  try {
    const { url } = await createCheckoutSession(formData);
    window.location.assign(url);
  } catch (error) {
    checkoutAlert.show(error.message);
    payButton.disabled = false;
    payButton.textContent = "Continue to secure payment";
  }
});

async function showPaymentConfirmation(sessionId) {
  // Payment confirmation now lives on its own page — Stripe redirects
  // straight to /checkout/confirmation, so this only runs if someone lands
  // back on /checkout with a stale session_id in the URL.
  window.location.replace(`/checkout/confirmation${window.location.search}`);
}

const sessionId = new URLSearchParams(window.location.search).get("session_id");
if (sessionId) {
  showPaymentConfirmation(sessionId);
} else {
  loadCheckout();
}
