-- Speeds up the two most frequently-run storefront queries:
--   * filtering products by category (products page)
--   * looking up a category by its URL slug
-- Both currently work without an index (Postgres just scans the whole
-- table), which is fine at a handful of products but degrades linearly as
-- your catalog grows.

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products (category_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug
  ON categories (slug);

-- The homepage's featured-products query filters on this directly.
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products (featured)
  WHERE featured = true;

-- Note: the free-text search (p.name ILIKE '%term%') can't use a normal
-- btree index because of the leading wildcard — Postgres has to scan every
-- row regardless. Fine at your current catalog size. If search gets slow
-- as the catalog grows, the fix is a trigram index instead:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
-- Not added now since it requires enabling a Postgres extension, which some
-- managed hosts restrict — worth doing once search performance actually
-- becomes a problem, not preemptively.