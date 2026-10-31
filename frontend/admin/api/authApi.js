import { adminRequest } from "./http.js";

export function login(email, password) {
  return adminRequest("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return adminRequest("/logout", {
    method: "POST",
  });
}

export async function getCurrentAdmin() {
  try {
    return await adminRequest("/me");
  } catch {
    return null;
  }
}
