import { getOrders, getOrder, updateOrderStatus } from "./api/ordersApi.js";
import { showToast } from "./toast.js";
import { escapeHtml, formatPrice } from "../js/utils.js";

let allOrders = [];
let currentPage = 1;

const ordersList = document.querySelector("#orders-list");

const orderModal = document.querySelector("#order-modal");
const orderModalClose = document.querySelector("#order-modal-close");
const orderDetails = document.querySelector("#order-details");

const previousPageButton = document.querySelector("#previous-page");
const nextPageButton = document.querySelector("#next-page");
const pageNumber = document.querySelector("#page-number");

// ======================================================
// LOAD / RENDER
// ======================================================

function updatePagination(data) {
  pageNumber.textContent = `Page ${data.currentPage} of ${data.totalPages}`;
  previousPageButton.disabled = data.currentPage === 1;
  nextPageButton.disabled = data.currentPage === data.totalPages;
}

export async function loadOrders(page = currentPage) {
  try {
    const data = await getOrders(page);

    currentPage = data.currentPage;
    allOrders = data.orders;

    renderOrders(allOrders);
    updatePagination(data);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <tr>
        <td colspan="6">
          No orders yet.
        </td>
      </tr>
    `;

    return;
  }

  ordersList.innerHTML = orders
    .map((order) => {
      const date = new Date(order.createdAt).toLocaleDateString("en-GB");
      const customerName = escapeHtml(order.customerName);
      const customerEmail = escapeHtml(order.customerEmail);
      const status = escapeHtml(order.status);

      return `
        <tr>

          <td class="order-number">
            #${order.id}
          </td>

          <td>
            ${customerName}

            <span class="customer-email">
              ${customerEmail}
            </span>
          </td>

          <td>
            ${date}
          </td>

          <td>
            ${formatPrice(order.totalInPence)}
          </td>

          <td>
            <span class="status ${status.toLowerCase()}">
              ${status}
            </span>
          </td>

          <td>
            <button
              type="button"
              class="view-order"
              data-order-id="${order.id}"
            >
              View
            </button>
          </td>

        </tr>
      `;
    })
    .join("");
}

// ======================================================
// ORDER DETAIL MODAL
// ======================================================

ordersList.addEventListener("click", async (event) => {
  const button = event.target.closest(".view-order");

  if (!button) return;

  const orderId = Number(button.dataset.orderId);

  try {
    const order = await getOrder(orderId);
    showOrder(order);
  } catch (error) {
    showToast(error.message, "error");
  }
});

function showOrder(order) {
  const items = order.items
    .map((item) => {
      const productName = escapeHtml(item.variantName ? `${item.productName} — ${item.variantName}` : item.productName);

      return `
        <div class="status-control">

        <label for="order-status">
        Order status
        </label>

        <select id="order-status">

        <option value="pending" ${order.status === "pending" ? "selected" : ""}>
        Pending
        </option>

        <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>
        Confirmed
        </option>

        <option value="preparing" ${order.status === "preparing" ? "selected" : ""}>
        Preparing
        </option>

        <option value="ready" ${order.status === "ready" ? "selected" : ""}>
        Ready
        </option>

        <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>
        Delivered
        </option>

        </select>

        <button
        type="button"
        id="update-status"
        data-order-id="${order.id}"
        >
        Update Status
        </button>

        </div>
        <div class="order-item">

          <div>
            <strong>
              ${productName}
            </strong>

            <div>
              Quantity: ${item.quantity}
            </div>
          </div>

          <strong>
            ${formatPrice(item.priceInPence * item.quantity)}
          </strong>

        </div>
      `;
    })
    .join("");

  const customerName = escapeHtml(order.customerName);
  const customerEmail = escapeHtml(order.customerEmail);
  const customerPhone = escapeHtml(order.customerPhone || "");
  const deliveryAddress = escapeHtml(order.deliveryAddress || "");
  const deliveryCity = escapeHtml(order.deliveryCity || "");
  const deliveryPostcode = escapeHtml(order.deliveryPostcode || "");
  const deliveryNotes = escapeHtml(order.deliveryNotes || "");

  orderDetails.innerHTML = `
    <h2>
      Order #${order.id}
    </h2>

    <p>
      <strong>${customerName}</strong>
    </p>

    <p>${customerEmail}</p>

    <p>${customerPhone}</p>


    <div class="delivery-details">

      <strong>Delivery address</strong>

      <p>${deliveryAddress}</p>

      <p>
        ${deliveryCity}
        ${deliveryPostcode}
      </p>

      ${
        deliveryNotes
          ? `
              <p>
                <strong>Notes:</strong>
                ${deliveryNotes}
              </p>
            `
          : ""
      }

    </div>


    <div class="order-items">

      <h3>Items</h3>

      ${items}

    </div>


    <div class="order-total">

      <span>Total</span>

      <span>
        ${formatPrice(order.totalInPence)}
      </span>

    </div>
  `;

  orderModal.hidden = false;
}

orderModalClose.addEventListener("click", () => {
  orderModal.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !orderModal.hidden) {
    orderModal.hidden = true;
  }
});

orderDetails.addEventListener("click", async (event) => {
  const button = event.target.closest("#update-status");

  if (!button) return;

  const orderId = Number(button.dataset.orderId);
  const statusSelect = document.querySelector("#order-status");
  const status = statusSelect.value;

  try {
    button.disabled = true;
    button.textContent = "Updating...";

    await updateOrderStatus(orderId, status);

    showToast("Order status updated successfully.");

    await loadOrders();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Update Status";
  }
});

// ======================================================
// FILTERS
// ======================================================

const orderFilters = document.querySelectorAll(".order-filter");

orderFilters.forEach((button) => {
  button.addEventListener("click", () => {
    orderFilters.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const status = button.dataset.status;

    if (status === "all") {
      renderOrders(allOrders);
      return;
    }

    renderOrders(allOrders.filter((order) => order.status === status));
  });
});

// ======================================================
// PAGINATION
// ======================================================

previousPageButton?.addEventListener("click", () => {
  if (currentPage > 1) loadOrders(currentPage - 1);
});

nextPageButton?.addEventListener("click", () => {
  loadOrders(currentPage + 1);
});
