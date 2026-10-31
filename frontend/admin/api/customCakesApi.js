import { adminRequest } from "./http.js";

export function getCustomCakes() {
  return adminRequest("/custom-cakes");
}

export function getCustomCake(id) {
  return adminRequest(`/custom-cakes/${id}`);
}

export function updateCakeStatus(id, status) {
  return adminRequest(`/custom-cakes/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export function updateCakeQuote(id, quotedPrice) {
  return adminRequest(`/custom-cakes/${id}/quote`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quotedPrice,
    }),
  });
}

export function updateCakeNotes(id, adminNotes) {
  return adminRequest(`/custom-cakes/${id}/notes`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adminNotes,
    }),
  });
}
