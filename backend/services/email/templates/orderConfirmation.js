import { renderEmailLayout, renderItemsTable, escapeHtml, formatPrice } from "./layout.js";

/**
 * @param {object} order - The formatted order object returned by
 *   orderService (id, customerName, deliveryAddress, items, totalInPence, ...)
 */
export function buildOrderConfirmationEmail(order) {
  const firstName = order.customerName?.split(" ")[0] || "there";
  const addressLine = [order.deliveryAddress, order.deliveryCity, order.deliveryPostcode].filter(Boolean).join(", ");

  const bodyHtml = `
    <p style="margin:0 0 16px; color:#353a56; font-size:15px; line-height:1.6;">
      Hi ${escapeHtml(firstName)}, thank you for your order! We've received it and we'll be in
      touch with delivery updates.
    </p>

    <p style="margin:0 0 4px; color:#776c68; font-size:13px;">Order #${order.id}</p>

    ${renderItemsTable(order.items)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
      <tr>
        <td style="padding: 4px 0; color:#776c68; font-size:14px;">Subtotal</td>
        <td style="padding: 4px 0; color:#353a56; font-size:14px; text-align:right;">${formatPrice(order.subtotalInPence)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color:#776c68; font-size:14px;">Delivery</td>
        <td style="padding: 4px 0; color:#353a56; font-size:14px; text-align:right;">${order.deliveryFeeInPence ? formatPrice(order.deliveryFeeInPence) : "Free"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0 0; color:#353a56; font-size:15px; font-weight:bold; border-top:1px solid #f0e3d7;">Total paid</td>
        <td style="padding: 8px 0 0; color:#353a56; font-size:15px; font-weight:bold; text-align:right; border-top:1px solid #f0e3d7;">${formatPrice(order.totalInPence)}</td>
      </tr>
    </table>

    <p style="margin:24px 0 4px; color:#776c68; font-size:13px; text-transform:uppercase; letter-spacing:0.04em;">Delivering to</p>
    <p style="margin:0; color:#353a56; font-size:14px; line-height:1.6;">
      ${escapeHtml(order.customerName)}<br />
      ${escapeHtml(addressLine)}
      ${order.deliveryNotes ? `<br /><span style="color:#776c68;">Note: ${escapeHtml(order.deliveryNotes)}</span>` : ""}
    </p>
  `;

  return {
    subject: `Order confirmed — #${order.id}`,
    html: renderEmailLayout({
      preheader: `Your Home Cake order #${order.id} is confirmed.`,
      heading: "Your order is confirmed!",
      bodyHtml,
    }),
    text: [
      `Hi ${firstName}, thank you for your order!`,
      `Order #${order.id}`,
      ...order.items.map(
        (item) => `${item.name} x${item.quantity} — ${formatPrice(item.priceInPence * item.quantity)}`,
      ),
      `Subtotal: ${formatPrice(order.subtotalInPence)}`,
      `Delivery: ${order.deliveryFeeInPence ? formatPrice(order.deliveryFeeInPence) : "Free"}`,
      `Total paid: ${formatPrice(order.totalInPence)}`,
      `Delivering to: ${order.customerName}, ${addressLine}`,
    ].join("\n"),
  };
}
