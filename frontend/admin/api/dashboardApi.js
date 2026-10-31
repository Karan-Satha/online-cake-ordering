import { adminRequest } from "./http.js";

export function getDashboardStats() {
  return adminRequest("/dashboard");
}
