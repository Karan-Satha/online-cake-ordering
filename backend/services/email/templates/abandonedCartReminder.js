import { renderEmailLayout, renderItemsTable, renderButton, escapeHtml, formatPrice } from "./layout.js";

/**
 * @param {object} params
 * @param {string} params.customerName
 * @param {Array<{name, priceInPence, quantity}>} params.items
 * @param {string} params.cartUrl - Link back to checkout so they can pick up where they left off.
 */
export function buildAbandonedCartEmail({ customerName, items, cartUrl }) {
  const firstName = customerName?.split(" ")[0] || "there";
  const totalInPence = items.reduce((total, item) => total + item.priceInPence * item.quantity, 0);

  const bodyHtml = `
    <p style="margin:0 0 16px; color:#353a56; font-size:15px; line-height:1.6;">
      Hi ${escapeHtml(firstName)}, you left something delicious behind! Your basket is still
      waiting for you, but it won't hold forever if items sell out.
    </p>

    ${renderItemsTable(items)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
      <tr>
        <td style="padding: 8px 0 0; color:#353a56; font-size:15px; font-weight:bold; border-top:1px solid #f0e3d7;">Subtotal</td>
        <td style="padding: 8px 0 0; color:#353a56; font-size:15px; font-weight:bold; text-align:right; border-top:1px solid #f0e3d7;">${formatPrice(totalInPence)}</td>
      </tr>
    </table>

    ${renderButton({ href: cartUrl, label: "Return to your basket" })}

    <p style="margin:16px 0 0; color:#776c68; font-size:12px; line-height:1.6;">
      You're getting this because you started an order with us and asked to be reminded if you
      didn't finish checking out. This is a one-off message — we won't email you again unless
      you start another order.
    </p>
  `;

  return {
    subject: `You left something in your basket, ${firstName}`,
    html: renderEmailLayout({
      preheader: "Your Home Cake basket is still waiting for you.",
      heading: "Still thinking it over?",
      bodyHtml,
    }),
    text: [
      `Hi ${firstName}, you left something in your Home Cake basket.`,
      ...items.map((item) => `${item.name} x${item.quantity} — ${formatPrice(item.priceInPence * item.quantity)}`),
      `Subtotal: ${formatPrice(totalInPence)}`,
      `Finish your order: ${cartUrl}`,
    ].join("\n"),
  };
}
