// A minimal in-memory cache for storefront read queries that are hit on
// nearly every page load (product list, categories, featured products) but
// change rarely — only when an admin edits the catalog.
//
// This is intentionally simple: a single process's memory, no Redis, no
// distributed invalidation. That's the right tradeoff at this project's
// scale (one Node process). If this ever runs as multiple instances behind
// a load balancer, each instance would keep its own cache — still correct
// (each just serves data up to CACHE_TTL_MS stale), but invalidateAll()
// would only clear the instance that handled the admin request. At that
// point, swap this for a shared cache (Redis) so all instances invalidate
// together.

const CACHE_TTL_MS = 60 * 1000;

const cache = new Map();

/**
 * Returns the cached value for `key` if it's still fresh; otherwise calls
 * `loader()`, caches the result, and returns it.
 */
export async function getCached(key, loader) {
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await loader();

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return data;
}

/**
 * Clears every cached entry. Call this after any admin write that could
 * change what these queries return (creating, editing, or deleting a
 * product or category) so customers never see stale data for longer than
 * it takes the admin action to complete.
 */
export function invalidateAll() {
  cache.clear();
}
