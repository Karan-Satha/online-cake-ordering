import { getMyOrders } from "./api.js";
import { escapeHtml, formatPrice } from "./utils.js";
import { logoutAndRefresh } from "./accountModal.js";

const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for delivery",
  delivered: "Delivered",
};

const loadingEl = document.querySelector("#account-loading");
const guestEl = document.querySelector("#account-guest");
const dashboardEl = document.querySelector("#account-dashboard");

const nameEl = document.querySelector("#account-name");
const emailEl = document.querySelector("#account-email");
const logoutButton = document.querySelector("#account-logout");

const ordersList = document.querySelector("#account-orders-list");
const ordersEmpty = document.querySelector("#account-orders-empty");

function formatOrderDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersEmpty.hidden = false;
    ordersList.innerHTML = "";
    return;
  }

  ordersEmpty.hidden = true;

  ordersList.innerHTML = orders
    .map((order) => {
      const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
      const itemsSummary = order.items.map((item) => `${item.quantity}× ${escapeHtml(item.name)}`).join(", ");

      return `
        <li class="account-order">
          <div class="account-order__header">
            <div>
              <p class="account-order__id">Order #${order.id}</p>
              <p class="account-order__date">${formatOrderDate(order.createdAt)}</p>
            </div>
            <span class="account-order__status account-order__status--${escapeHtml(order.status)}">${escapeHtml(statusLabel)}</span>
          </div>
          <p class="account-order__items">${itemsSummary}</p>
          ${order.discountCode && order.discountInPence > 0 ? `<p class="account-order__discount">Discount (${escapeHtml(order.discountCode)}): −${formatPrice(order.discountInPence)}</p>` : ""}
          <p class="account-order__total">${formatPrice(order.totalInPence)}</p>
        </li>
      `;
    })
    .join("");
}

async function showDashboard(customer) {
  loadingEl.hidden = true;
  guestEl.hidden = true;
  dashboardEl.hidden = false;

  nameEl.textContent = `Hi, ${customer.name.split(" ")[0]}`;
  emailEl.textContent = customer.email;

  try {
    const orders = await getMyOrders();
    renderOrders(orders);
  } catch (error) {
    ordersList.innerHTML = `<li class="account-order account-order--error">Couldn't load your orders. Please refresh the page.</li>`;
  }
}

function showGuestState() {
  loadingEl.hidden = true;
  dashboardEl.hidden = true;
  guestEl.hidden = false;
}

document.addEventListener("account:ready", (event) => {
  const customer = event.detail.customer;

  if (customer) {
    showDashboard(customer);
  } else {
    showGuestState();
  }
});

// If someone logs in from this page's guest prompt, or logs out from the
// dashboard, react immediately rather than waiting for a page reload.
document.addEventListener("account:changed", (event) => {
  const customer = event.detail.customer;

  if (customer) {
    showDashboard(customer);
  } else {
    showGuestState();
  }
});

logoutButton?.addEventListener("click", async () => {
  await logoutAndRefresh();
});
