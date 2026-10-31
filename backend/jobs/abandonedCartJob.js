import cron from "node-cron";

import pool from "../db.js";
import { config } from "../config/index.js";
import { sendEmail } from "../services/email/emailClient.js";
import { buildAbandonedCartEmail } from "../services/email/templates/abandonedCartReminder.js";
import { logger } from "../utils/logger.js";

/**
 * Finds checkout sessions that were started but never completed, are past
 * the abandonment threshold, opted in to the reminder, and still have items
 * in the cart (proving the customer didn't check out some other way) — then
 * sends one reminder email per session.
 *
 * The claiming UPDATE marks abandoned_email_sent_at *before* sending, in
 * the same atomic statement that selects eligible rows. This means a
 * session is only ever claimed once even if this job somehow ran
 * concurrently with itself, at the small cost that a mid-send crash would
 * leave that one email unsent with no automatic retry — an acceptable
 * trade-off over the alternative of risking a duplicate send.
 */
export async function runAbandonedCartJob() {
  let claimedSessions;

  try {
    const result = await pool.query(
      `
        UPDATE checkout_sessions cs
        SET abandoned_email_sent_at = NOW()
        WHERE cs.status = 'pending'
          AND cs.marketing_opt_in = TRUE
          AND cs.abandoned_email_sent_at IS NULL
          AND cs.created_at < NOW() - ($1 || ' hours')::interval
          AND EXISTS (
            SELECT 1 FROM cart_items ci WHERE ci.cart_id = cs.cart_id
          )
        RETURNING cs.id, cs.cart_id, cs.customer_name, cs.customer_email
      `,
      [config.abandonedCartDelayHours],
    );

    claimedSessions = result.rows;
  } catch (error) {
    logger.error(`Abandoned-cart job failed to query sessions: ${error.message}`);
    return;
  }

  if (claimedSessions.length === 0) {
    return;
  }

  logger.info(`Abandoned-cart job: sending ${claimedSessions.length} reminder(s)`);

  for (const session of claimedSessions) {
    try {
      const itemsResult = await pool.query(
        `
          SELECT p.name, p.price_in_pence AS "priceInPence", ci.quantity
          FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = $1
        `,
        [session.cart_id],
      );

      if (itemsResult.rows.length === 0) {
        // Cart was emptied between the claim query and now (rare race) —
        // nothing to remind them about.
        continue;
      }

      const cartUrl = new URL("/checkout", config.frontendUrl).toString();

      const email = buildAbandonedCartEmail({
        customerName: session.customer_name,
        items: itemsResult.rows,
        cartUrl,
      });

      const result = await sendEmail({
        to: session.customer_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (!result.success) {
        logger.error(`Abandoned-cart email failed for checkout session #${session.id}: ${result.error}`);
      }
    } catch (error) {
      logger.error(`Abandoned-cart job failed processing checkout session #${session.id}: ${error.message}`);
    }
  }
}

/**
 * Starts the recurring schedule. Call once at server startup.
 */
export function startAbandonedCartJob() {
  // Every 15 minutes. Threshold itself (how "old" is abandoned) is
  // config.abandonedCartDelayHours, not this schedule interval.
  cron.schedule("*/15 * * * *", () => {
    runAbandonedCartJob().catch((error) => {
      logger.error(`Abandoned-cart job crashed: ${error.message}`);
    });
  });

  logger.info("Abandoned-cart reminder job scheduled (every 15 minutes)");
}
