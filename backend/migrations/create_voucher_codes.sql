CREATE TABLE IF NOT EXISTS voucher_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The single code the welcome overlay promotes to every newsletter
-- subscriber. ON CONFLICT DO NOTHING makes this migration safe to re-run.
INSERT INTO voucher_codes (code, discount_percent)
VALUES ('WELCOME10', 10)
ON CONFLICT (code) DO NOTHING;

-- Tracks which code (if any) was applied to a checkout, so the actual
-- charged amount can be verified against it, and so order history can show
-- "Discount: -£X" instead of the discount silently disappearing.
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_in_pence INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_in_pence INTEGER NOT NULL DEFAULT 0;