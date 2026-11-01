import { renderEmailLayout, escapeHtml } from "./layout.js";

export function buildCustomCakeRequestReceivedEmail({ customerName, referenceNumber }) {
  const firstName = customerName?.trim().split(/\s+/)[0] || "there";
  const reference = referenceNumber || "pending";
  const bodyHtml = `
    <p style="margin:0 0 16px; color:#353a56; font-size:15px; line-height:1.6;">
      Hi ${escapeHtml(firstName)}, thanks for sharing your cake idea. We've received your request and
      our team will review the details and get back to you.
    </p>
    <p style="margin:0; color:#776c68; font-size:13px;">Request reference: ${escapeHtml(reference)}</p>
  `;

  return {
    subject: `Custom cake request received — ${reference}`,
    html: renderEmailLayout({
      preheader: `We've received your custom cake request ${reference}.`,
      heading: "Your cake request is with us!",
      bodyHtml,
    }),
    text: [
      `Hi ${firstName}, thanks for sharing your cake idea.`,
      "We've received your request and our team will review the details and get back to you.",
      `Request reference: ${reference}`,
    ].join("\n\n"),
  };
}
