import pool from "../../db.js";
import AppError from "../../utils/AppError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(email, source = "footer") {
  const trimmedEmail = email?.trim().toLowerCase();

  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  // Reads the subscriber's previous status (if any) in the same statement
  // as the upsert, so we can tell a brand-new signup or a resubscribe
  // (both worth a welcome email) apart from someone re-submitting the form
  // while already subscribed (nothing to send).
  const result = await pool.query(
    `
      WITH before AS (
        SELECT status FROM newsletter_subscribers WHERE email = $1
      )
      INSERT INTO newsletter_subscribers (email, source)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE
        SET status = 'subscribed',
            unsubscribed_at = NULL
      RETURNING
        email,
        unsubscribe_token AS "unsubscribeToken",
        (xmax = 0) AS "isNewSignup",
        (SELECT status FROM before) AS "previousStatus"
    `,
    [trimmedEmail, source],
  );

  const row = result.rows[0];

  return {
    email: row.email,
    unsubscribeToken: row.unsubscribeToken,
    shouldSendWelcome: row.isNewSignup || row.previousStatus === "unsubscribed",
  };
}

export async function unsubscribeFromNewsletter(token) {
  if (!token) {
    throw new AppError("Missing unsubscribe token", 400);
  }

  const result = await pool.query(
    `
      UPDATE newsletter_subscribers
      SET status = 'unsubscribed',
          unsubscribed_at = NOW()
      WHERE unsubscribe_token = $1
      RETURNING email
    `,
    [token],
  );

  // Don't distinguish "already unsubscribed" from "unknown token" in the
  // response — both just mean the address won't receive further emails,
  // and there's no reason to leak which case it was.
  return { success: true, email: result.rows[0]?.email ?? null };
}
