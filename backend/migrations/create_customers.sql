CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  reset_token UUID,
  reset_token_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email));

-- Orders aren't linked to a customer_id — checkout stays guest-friendly,
-- and a logged-in customer's order history is matched by email instead
-- (see services/shop/customerOrderService.js). This index backs that
-- lookup, the same way idx_orders_stripe_session_id backs the webhook's.
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (LOWER(customer_email));