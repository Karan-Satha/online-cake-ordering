import { getDashboardStats } from "./api/dashboardApi.js";
import { escapeHtml, formatPrice } from "../js/utils.js";

const ordersCount = document.querySelector("#orders-count");
const productsCount = document.querySelector("#products-count");
const pendingOrders = document.querySelector("#pending-orders");
const revenueTotal = document.querySelector("#revenue-total");
const recentOrdersBody = document.querySelector("#recent-orders-body");

export async function loadDashboard() {
  const stats = await getDashboardStats();

  ordersCount.textContent = stats.orders;
  productsCount.textContent = stats.products;
  pendingOrders.textContent = stats.pendingOrders;
  revenueTotal.textContent = formatPrice(stats.revenueInPence);

  recentOrdersBody.innerHTML = stats.recentOrders
    .map(
      (order) => `
      <tr>

        <td>#${order.id}</td>

        <td>${escapeHtml(order.customerName)}</td>

        <td>
          ${escapeHtml(order.status)}
        </td>

        <td>
          ${formatPrice(order.totalInPence)}
        </td>

      </tr>
    `,
    )
    .join("");
}
