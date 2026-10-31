import pool from "../../db.js";
import { buildCakePrompt } from "./customCakePromptService.js";

function generateReferenceNumber(id) {
  const year = new Date().getFullYear();

  return `HC-${year}-${String(id).padStart(6, "0")}`;
}

export async function createCustomCakeRequest(data) {
  // Multer represents repeated multipart fields as arrays, but a field sent
  // once is a string. PostgreSQL's text[] parameter requires an array value;
  // passing a single string (e.g. "Fresh Flowers") causes 22P02.
  const decorations = data.decorations == null
    ? []
    : Array.isArray(data.decorations)
      ? data.decorations
      : [data.decorations];
  const normalizedData = { ...data, decorations };
  const prompt = buildCakePrompt(normalizedData);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      INSERT INTO custom_cake_requests (
        cake_type,
        shape,
        tiers,
        cake_size,
        flavour,
        style,
        theme,
        primary_colour,
        secondary_colour,
        decorations,
        delivery_date,
        cake_message,
        notes,
        customer_name,
        customer_email,
        customer_phone,
        inspiration_images,
        ai_preview_image,
        ai_prompt,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,
        $8,$9,
        $10,
        $11,
        $12,$13,
        $14,$15,$16,
        $17,$18,$19,
        $20
      )
      RETURNING *
      `,
      [
        data.cakeType,
        data.shape,
        data.tiers,
        data.cakeSize,
        data.flavour,
        data.style,
        data.theme,
        data.primaryColour,
        data.secondaryColour,
        decorations,
        data.deliveryDate,
        data.cakeMessage,
        data.notes,
        data.name,
        data.email,
        data.phone,
        JSON.stringify(data.inspirationImages || []),
        data.aiPreviewImage || null,
        prompt,
        "new",
      ],
    );

    const request = rows[0];

    const referenceNumber = generateReferenceNumber(request.id);

    const { rows: updatedRows } = await client.query(
      `
      UPDATE custom_cake_requests
      SET reference_number = $1
      WHERE id = $2
      RETURNING *
      `,
      [referenceNumber, request.id],
    );

    await client.query("COMMIT");

    return updatedRows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  } finally {
    client.release();
  }
}
