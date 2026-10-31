import Stripe from "stripe";

import { config } from "../../config/index.js";
import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { completeCheckoutSessionAndNotify } from "../../services/shop/checkoutCompletionService.js";

export async function stripeWebhook(req, res) {
  let event;

  try {
    if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
      return res.status(503).json({ error: "Stripe webhooks are not configured" });
    }

    const signature = req.headers["stripe-signature"];
    const stripe = new Stripe(config.stripeSecretKey);

    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);

    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);

    return res.status(error.statusCode || 500).json({
      error: "Webhook processing failed",
    });
  }
}

async function handleCheckoutCompleted(session) {
  const checkoutSessionResult = await pool.query(
    `
      SELECT *
      FROM checkout_sessions
      WHERE stripe_session_id = $1
      LIMIT 1
    `,
    [session.id],
  );

  const checkoutSession = checkoutSessionResult.rows[0];

  if (!checkoutSession) {
    throw new AppError(`Checkout session not found: ${session.id}`, 404);
  }

  if (checkoutSession.status === "completed") {
    return;
  }

  await completeCheckoutSessionAndNotify(checkoutSession, session);
}
