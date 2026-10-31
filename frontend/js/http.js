// Shared fetch client.
//
// Every API module (shop `js/api.js`, admin `admin/api/*`) builds its
// requests through a client created here instead of hand-rolling
// `fetch` + `credentials` + JSON-parsing + error-handling each time.
export function createHttpClient(baseUrl) {
  return async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      ...options,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Something went wrong");
    }

    return data;
  };
}
