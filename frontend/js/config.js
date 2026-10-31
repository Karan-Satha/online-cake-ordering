// The backend serves the storefront and admin UI from the same origin in
// production. During local development the frontend is commonly served by
// Live Server on :5500 while the API remains on :3000. A separate frontend
// deployment can set window.HOME_CAKE_API_ORIGIN before loading modules.
const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  && window.location.port !== "3000";
const defaultApiOrigin = isLocalFrontend
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : window.location.origin;

export const BASE_URL = (window.HOME_CAKE_API_ORIGIN || defaultApiOrigin).replace(/\/$/, "");
export const API_URL = `${BASE_URL}/api`;
