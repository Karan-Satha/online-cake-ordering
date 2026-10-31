import { adminRequest } from "./http.js";

export function getVouchers() {
  return adminRequest("/vouchers");
}

export function getVoucher(voucherId) {
  return adminRequest(`/vouchers/${voucherId}`);
}

export function createVoucher(voucher) {
  return adminRequest("/vouchers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(voucher),
  });
}

export function updateVoucher(voucherId, voucher) {
  return adminRequest(`/vouchers/${voucherId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(voucher),
  });
}

export function deleteVoucher(voucherId) {
  return adminRequest(`/vouchers/${voucherId}`, {
    method: "DELETE",
  });
}
