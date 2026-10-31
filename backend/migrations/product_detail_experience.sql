-- Product detail content and optional price/portion variants.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ingredients text,
  ADD COLUMN IF NOT EXISTS allergens text,
  ADD COLUMN IF NOT EXISTS allergy_advice text,
  ADD COLUMN IF NOT EXISTS storage_instructions text,
  ADD COLUMN IF NOT EXISTS shelf_life text,
  ADD COLUMN IF NOT EXISTS nutrition jsonb,
  ADD COLUMN IF NOT EXISTS image_gallery text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bestseller_override boolean;

CREATE TABLE IF NOT EXISTS product_variants (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  servings integer CHECK (servings IS NULL OR servings > 0),
  price_in_pence integer NOT NULL CHECK (price_in_pence >= 0),
  details text,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_product_name_key UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_active
  ON product_variants (product_id, active, position, id);

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS variant_id integer REFERENCES product_variants(id) ON DELETE CASCADE;

ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_cart_product_variant_key
  UNIQUE NULLS NOT DISTINCT (cart_id, product_id, variant_id);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_name varchar(100);
