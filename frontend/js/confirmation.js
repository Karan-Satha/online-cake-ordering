import { assetUrl } from "./config.js";
import { completeCheckout } from "./api.js";
import { escapeHtml, formatPrice } from "./utils.js";
import { clearPendingVoucher } from "./voucher.js";
import { initAlert } from "./formValidation.js";

const confirmationTitle = document.querySelector("#confirmation-title");
const confirmationSubtitle = document.querySelector("#confirmation-subtitle");
const confirmationAlert = initAlert(document.querySelector("#confirmation-error"));
const confirmationLayout = document.querySelector("#confirmation-layout");

const nameSuffix = document.querySelector("#confirmation-name-suffix");
const orderIdEl = document.querySelector("#confirmation-order-id");
const orderDateEl = document.querySelector("#confirmation-order-date");

const customerNameEl = document.querySelector("#confirmation-customer-name");
const customerEmailEl = document.querySelector("#confirmation-customer-email");
const customerPhoneEl = document.querySelector("#confirmation-customer-phone");
const addressEl = document.querySelector("#confirmation-address");
const notesRow = document.querySelector("#confirmation-notes-row");
const notesEl = document.querySelector("#confirmation-notes");

const itemsList = document.querySelector("#confirmation-items");
const subtotalEl = document.querySelector("#confirmation-subtotal");
const discountRow = document.querySelector("#confirmation-discount-row");
const discountLabelEl = document.querySelector("#confirmation-discount-label");
const discountEl = document.querySelector("#confirmation-discount");
const deliveryEl = document.querySelector("#confirmation-delivery");
const totalEl = document.querySelector("#confirmation-total");

function showError(message) {
  confirmationTitle.textContent = "We couldn't confirm that order";
  confirmationSubtitle.textContent =
    "Please check your email for a receipt, or contact us if you paid but don't see a confirmation here.";
  confirmationAlert.show(message);
  confirmationLayout.hidden = true;
}

function formatOrderDate(isoString) {
  if (!isoString) return "";

  return new Date(isoString).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderItems(items) {
  itemsList.innerHTML = items
    .map((item) => {
      const name = escapeHtml(item.name);
      const image = item.image ? assetUrl(item.image) : "/assets/images/logo.webp";

      return `
        <li class="checkout-item confirmation-item">
          <img src="${image}" alt="${name}" />
          <div><strong>${name}</strong><span>${formatPrice(item.priceInPence)}</span></div>
          <div class="confirmation-item__qty">Qty: ${item.quantity}</div>
        </li>
      `;
    })
    .join("");
}

function renderOrder(order) {
  confirmationTitle.textContent = "Your order is confirmed!";
  confirmationSubtitle.textContent = "Thank you for choosing Home Cake — here's everything you need to know.";

  nameSuffix.textContent = order.customerName ? `, ${order.customerName.split(" ")[0]}` : "";

  orderIdEl.textContent = `#${order.id}`;
  orderDateEl.textContent = order.createdAt ? `Placed ${formatOrderDate(order.createdAt)}` : "";

  customerNameEl.textContent = order.customerName || "—";
  customerEmailEl.textContent = order.customerEmail || "—";
  customerPhoneEl.textContent = order.customerPhone || "—";

  const addressParts = [order.deliveryAddress, order.deliveryCity, order.deliveryPostcode].filter(Boolean);
  addressEl.textContent = addressParts.join(", ") || "—";

  if (order.deliveryNotes) {
    notesRow.hidden = false;
    notesEl.textContent = order.deliveryNotes;
  } else {
    notesRow.hidden = true;
  }

  renderItems(order.items || []);

  subtotalEl.textContent = formatPrice(order.subtotalInPence ?? 0);

  if (discountRow) {
    if (order.discountCode && order.discountInPence > 0) {
      discountRow.hidden = false;
      if (discountLabelEl) discountLabelEl.textContent = `Discount (${order.discountCode})`;
      if (discountEl) discountEl.textContent = `−${formatPrice(order.discountInPence)}`;
    } else {
      discountRow.hidden = true;
    }
  }

  deliveryEl.textContent = order.deliveryFeeInPence ? formatPrice(order.deliveryFeeInPence) : "Free";
  totalEl.textContent = formatPrice(order.totalInPence ?? 0);

  // The order is confirmed and paid — a stored code has done its job.
  // Clearing it means a future purchase won't keep re-applying an
  // already-used one-time code.
  clearPendingVoucher();

  confirmationLayout.hidden = false;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 8; // ~12 seconds total

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadConfirmation() {
  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  if (!sessionId) {
    showError(
      "We couldn't find a payment session for this page. If you've just placed an order, check your email for confirmation.",
    );
    return;
  }

  try {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      const result = await completeCheckout(sessionId);

      if (result.order) {
        renderOrder(result.order);
        return;
      }

      // status === "pending": payment is verified, but our webhook hasn't
      // finished creating the order yet. This is normal — it usually
      // resolves within a couple of seconds — so keep the loading state
      // and try again rather than showing an error.
      if (attempt < MAX_POLL_ATTEMPTS) {
        await wait(POLL_INTERVAL_MS);
      }
    }

    showError(
      "Your payment went through, but we're still finalising your order. This can take a minute — refresh this page shortly, or check your email for confirmation.",
    );
  } catch (error) {
    showError(error.message || "We couldn't verify this payment. Please contact us if you were charged.");
  }
}

loadConfirmation();
