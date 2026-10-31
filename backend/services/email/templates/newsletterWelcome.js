import { renderEmailLayout, renderButton, escapeHtml } from "./layout.js";

/**
 * @param {object} params
 * @param {string} params.shopUrl
 * @param {string} params.unsubscribeUrl
 * @param {string} [params.voucherCode] - If provided, the code is shown
 *   prominently as the reason to shop now.
 * @param {number} [params.discountPercent]
 */
export function buildNewsletterWelcomeEmail({ shopUrl, unsubscribeUrl, voucherCode, discountPercent }) {
  const voucherHtml = voucherCode
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
        <tr>
          <td style="padding: 16px; border: 2px dashed #e6bf61; border-radius: 12px; text-align: center;">
            <p style="margin:0 0 6px; color:#776c68; font-size:13px;">Your ${discountPercent}% off code</p>
            <p style="margin:0; color:#353a56; font-size:22px; font-weight:bold; letter-spacing:3px;">${escapeHtml(voucherCode)}</p>
          </td>
        </tr>
      </table>
    `
    : "";

  const bodyHtml = `
    <p style="margin:0 0 16px; color:#353a56; font-size:15px; line-height:1.6;">
      Thanks for signing up! You'll be the first to hear about new flavours, seasonal specials,
      and the occasional treat just for our list.
    </p>

    ${voucherHtml}

    ${renderButton({ href: shopUrl, label: voucherCode ? "Shop and save now" : "Browse the shop" })}
  `;

  return {
    subject: voucherCode ? `Here's your ${discountPercent}% off code 🍰` : "Welcome to the Home Cake list 🍰",
    html: renderEmailLayout({
      preheader: voucherCode
        ? `Use code ${voucherCode} for ${discountPercent}% off your first order.`
        : "You're on the list — expect new flavours and offers first.",
      heading: "You're on the list!",
      bodyHtml,
      footerHtml: `
        <p style="margin:8px 0 0; color:#776c68; font-size:12px;">
          <a href="${unsubscribeUrl}" style="color:#776c68;">Unsubscribe</a> at any time.
        </p>`,
    }),
    text: [
      "Thanks for signing up to the Home Cake newsletter!",
      voucherCode ? `Your ${discountPercent}% off code: ${voucherCode}` : "",
      `Browse the shop: ${shopUrl}`,
      `Unsubscribe: ${unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
