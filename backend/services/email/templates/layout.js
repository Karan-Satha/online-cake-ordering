// Table-based layout for maximum compatibility across email clients
// (Outlook in particular does not support flexbox/grid or most modern
// CSS, so this intentionally stays old-school: inline styles, tables,
// no external stylesheet).

const BRAND = {
  navy: "#353a56",
  cream: "#fbeddf",
  yellow: "#ffda17",
  gold: "#d29a64",
  textLight: "#776c68",
  borderLight: "#f0e3d7",
};

export function formatPrice(priceInPence) {
  return `£${(priceInPence / 100).toFixed(2)}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @param {object} options
 * @param {string} options.preheader - Hidden preview text shown in inbox lists.
 * @param {string} options.heading - Main heading inside the card.
 * @param {string} options.bodyHtml - Inner HTML for the card body.
 * @param {string} [options.footerHtml] - Optional extra footer content
 *   (e.g. an unsubscribe link) rendered below the standard sign-off.
 */
export function renderEmailLayout({ preheader = "", heading, bodyHtml, footerHtml = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.cream}; font-family: Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:6px; overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND.navy}; padding: 24px 32px;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:0.02em;">Home Cake</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h1 style="margin:0 0 16px; color:${BRAND.navy}; font-size:22px;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px; border-top: 1px solid ${BRAND.borderLight};">
                <p style="margin:0; color:${BRAND.textLight}; font-size:12px; line-height:1.6;">
                  Home Cake · London · homecake.co.uk
                </p>
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderItemsTable(items) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.borderLight}; color:${BRAND.navy}; font-size:14px;">
            ${escapeHtml(item.name)} <span style="color:${BRAND.textLight};">× ${item.quantity}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.borderLight}; color:${BRAND.navy}; font-size:14px; text-align:right; white-space:nowrap;">
            ${formatPrice(item.priceInPence * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">${rows}</table>`;
}

export function renderButton({ href, label }) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color:${BRAND.yellow}; border-radius:4px;">
          <a href="${href}" style="display:inline-block; padding: 12px 28px; color:${BRAND.navy}; font-weight:bold; font-size:14px; text-decoration:none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export { BRAND };
