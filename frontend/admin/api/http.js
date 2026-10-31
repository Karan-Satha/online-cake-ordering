import { API_URL } from "../../js/config.js";
import { createHttpClient } from "../../js/http.js";

// Every admin/api/*.js module makes its requests through this — same
// shared client the shop side (js/api.js) uses, just scoped to
// /api/admin.
export const adminRequest = createHttpClient(`${API_URL}/admin`);
