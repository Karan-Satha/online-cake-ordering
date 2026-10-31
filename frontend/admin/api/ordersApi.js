import { adminRequest } from "./http.js";

export function getOrders(page = 1, limit = 10) {
  return adminRequest(`/orders?page=${page}&limit=${limit}`);
}

export function getOrder(orderId) {
  return adminRequest(`/orders/${orderId}`);
}

export function updateOrderStatus(orderId, status) {
  return adminRequest(`/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}
