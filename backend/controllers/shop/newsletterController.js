import asyncHandler from "../../middleware/asyncHandler.js";
import { subscribeToNewsletter, unsubscribeFromNewsletter } from "../../services/shop/newsletterService.js";
import { getActiveVoucher } from "../../services/shop/voucherService.js";
import { sendEmail } from "../../services/email/emailClient.js";
import { buildNewsletterWelcomeEmail } from "../../services/email/templates/newsletterWelcome.js";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

// The single promo code the welcome overlay advertises to every visitor —
// looked up rather than hardcoding the percentage here too, so changing
// the discount in the voucher_codes table is the only place that needs to
// change for both checkout and this email to stay in sync.
const NEWSLETTER_VOUCHER_CODE = "WELCOME10";

export const subscribe = asyncHandler(async (req, res) => {
  const { email, unsubscribeToken, shouldSendWelcome } = await subscribeToNewsletter(req.body.email, "footer");

  if (shouldSendWelcome) {
    const unsubscribeUrl = new URL(
      `/api/newsletter/unsubscribe?token=${unsubscribeToken}`,
      config.frontendUrl,
    ).toString();

    const shopUrl = new URL("/shop/all", config.frontendUrl).toString();
    const voucher = await getActiveVoucher(NEWSLETTER_VOUCHER_CODE);

    const welcomeEmail = buildNewsletterWelcomeEmail({
      shopUrl,
      unsubscribeUrl,
      voucherCode: voucher?.code,
      discountPercent: voucher?.discountPercent,
    });
    const result = await sendEmail({
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text,
    });

    if (!result.success) {
      logger.error(`Newsletter welcome email failed: ${result.error}`);
    }
  }

  // Always respond the same way regardless of prior subscription state,
  // so the form can't be used to check whether an email is on the list.
  res.status(200).json({ message: "You're subscribed!" });
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await unsubscribeFromNewsletter(req.query.token);

  res.status(200).json({ message: "You've been unsubscribed." });
});
