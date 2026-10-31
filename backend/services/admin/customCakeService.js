import pool from "../../db.js";

export async function getCustomCakeRequests() {
  const { rows } = await pool.query(`
    SELECT
      id,
      reference_number,
      customer_name,
      delivery_date,
      status,
      created_at
    FROM custom_cake_requests
    ORDER BY created_at DESC
  `);

  return rows;
}

export async function getCustomCakeRequestById(id) {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM custom_cake_requests
    WHERE id = $1
    `,
    [id],
  );

  return rows[0];
}

export async function updateCustomCakeStatus(id, status) {
  const { rows } = await pool.query(
    `
    UPDATE custom_cake_requests
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status, id],
  );

  return rows[0];
}

export async function updateCustomCakeQuote(id, quotedPrice) {
  const { rows } = await pool.query(
    `
    UPDATE custom_cake_requests
    SET
      quoted_price = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [quotedPrice, id],
  );

  return rows[0];
}

export async function updateCustomCakeNotes(id, adminNotes) {
  const { rows } = await pool.query(
    `
    UPDATE custom_cake_requests
    SET
      admin_notes = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [adminNotes, id],
  );

  return rows[0];
}
