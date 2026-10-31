import asyncHandler from "../../middleware/asyncHandler.js";
import { getOrderForSession, createCheckoutSession } from "../../services/shop/checkoutService.js";

export const createSession = asyncHandler(async (req, res) => {
  const session = await createCheckoutSession(req.cartId, req.body);
  res.status(201).json(session);
});

export const completeSession = asyncHandler(async (req, res) => {
  const order = await getOrderForSession(req.cartId, req.body.sessionId);

  if (!order) {
    // Payment is verified as "paid" by Stripe, but our webhook hasn't
    // finished creating the order yet — this is normal and usually
    // resolves within a second or two. The frontend polls on this status.
    return res.status(202).json({ status: "pending" });
  }

  res.status(200).json({ order });
});
