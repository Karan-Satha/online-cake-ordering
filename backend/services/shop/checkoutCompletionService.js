import pool from "../../db.js";
import { createOrderService } from "./orderService.js";
import { sendEmail } from "../email/emailClient.js";
import { buildOrderConfirmationEmail } from "../email/templates/orderConfirmation.js";
import { logger } from "../../utils/logger.js";
import { invalidateAll as invalidateProductCache } from "./productCache.js";

/**
 * Creates the order for a paid checkout session (if it doesn't already
 * exist), marks the checkout_sessions row completed, and sends the
 * confirmation email — but only on the call that actually created the
 * order (order.isNew), never on a dedup-hit.
 *
 * This is called from two places:
 *   1. The Stripe webhook (checkout.session.completed) — the primary,
 *      authoritative path.
 *   2. A fallback in the confirmation-page endpoint, used only if the
 *      webhook hasn't completed the session by the time the browser is
 *      done polling (e.g. local dev without `stripe listen` forwarding,
 *      or a slow/lost webhook delivery in production).
 *
 * Both paths funnel through createOrderService's stripe_session_id
 * dedup, so calling this twice for the same session (a race between the
 * webhook and the fallback) can never create a duplicate order or send a
 * duplicate email — whichever call loses the race just returns the
 * existing order with isNew: false.
 */
export async function completeCheckoutSessionAndNotify(checkoutSession, stripeSession) {
  const deliveryFeeInPence = Number(stripeSession.metadata?.deliveryFeeInPence || 0);
  const discountInPence = Number(stripeSession.metadata?.discountInPence || 0);
  const discountCode = stripeSession.metadata?.discountCode || null;

  const order = await createOrderService(
    checkoutSession.cart_id,
    {
      customerName: checkoutSession.customer_name,
      customerEmail: checkoutSession.customer_email,
      customerPhone: checkoutSession.customer_phone,
      deliveryAddress: checkoutSession.delivery_address,
      deliveryCity: checkoutSession.delivery_city,
      deliveryPostcode: checkoutSession.delivery_postcode,
      deliveryNotes: checkoutSession.delivery_notes,
    },
    {
      deliveryFeeInPence,
      discountInPence,
      discountCode,
      expectedTotalInPence: stripeSession.amount_total,
      stripeSessionId: stripeSession.id,
    },
  );

  // Keep checkout_sessions.status accurate regardless of which path
  // completed it — the abandoned-cart job relies on status='pending' to
  // decide who to remind, and must never nudge someone who already
  // finished checking out via this fallback path.
  await pool.query(
    `
      UPDATE checkout_sessions
      SET
        status = 'completed',
        completed_at = NOW()
      WHERE stripe_session_id = $1
    `,
    [stripeSession.id],
  );
  if (order.isNew) invalidateProductCache();

  if (order.isNew) {
    const email = buildOrderConfirmationEmail(order);
    const result = await sendEmail({
      to: order.customerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (!result.success) {
      logger.error(`Order confirmation email failed for order #${order.id}: ${result.error}`);
    }
  }

  return order;
}
