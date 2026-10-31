import { renderEmailLayout, renderButton, escapeHtml } from "./layout.js";

/**
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.resetUrl
 */
export function buildPasswordResetEmail({ name, resetUrl }) {
  const firstName = name?.split(" ")[0] || "there";

  const bodyHtml = `
    <p style="margin:0 0 16px; color:#353a56; font-size:15px; line-height:1.6;">
      Hi ${escapeHtml(firstName)}, we received a request to reset your Home Cake account password.
      If this was you, click below to choose a new one. This link expires in 1 hour.
    </p>

    ${renderButton({ href: resetUrl, label: "Reset your password" })}

    <p style="margin:16px 0 0; color:#776c68; font-size:12px; line-height:1.6;">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  `;

  return {
    subject: "Reset your Home Cake password",
    html: renderEmailLayout({
      preheader: "Reset your Home Cake account password.",
      heading: "Reset your password",
      bodyHtml,
    }),
    text: [
      `Hi ${firstName}, we received a request to reset your Home Cake password.`,
      `Reset it here (expires in 1 hour): ${resetUrl}`,
      "If you didn't request this, you can ignore this email.",
    ].join("\n"),
  };
}
