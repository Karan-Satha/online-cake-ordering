import { Resend } from "resend";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { normalizeEmailAddress } from "../../utils/emailAddress.js";

let resendClient = null;

function getResendClient() {
  if (!config.resendApiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(config.resendApiKey);
  }

  return resendClient;
}

/**
 * Sends a single email via Resend.
 *
 * This never throws. Callers (webhook order-confirmation, the abandoned-cart
 * job, newsletter signup) must not fail the customer-facing request just
 * because the email provider hiccupped — every call resolves to
 * { success, id? , error? } so the caller can log and move on.
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const recipient = normalizeEmailAddress(to);

  if (!recipient) {
    logger.warn(`Email not sent (invalid recipient address): "${subject}"`);
    return { success: false, error: "A valid recipient email address is required" };
  }

  const client = getResendClient();

  if (!client) {
    logger.warn(`Email not sent (RESEND_API_KEY not configured): "${subject}"`);

    return { success: false, error: "Email provider not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${config.emailFromName} <${config.emailFromAddress}>`,
      to: recipient,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      logger.error(`Email send failed ("${subject}", ${error.name || "Resend error"}${error.statusCode ? `, HTTP ${error.statusCode}` : ""}): ${error.message}`);

      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    logger.error(`Email send threw ("${subject}", ${error.name || "Error"}): ${error.message}`);

    return { success: false, error: error.message };
  }
}
