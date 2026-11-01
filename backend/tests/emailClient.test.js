import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const resendSend = jest.fn();

jest.unstable_mockModule("resend", () => ({
  Resend: class MockResend {
    constructor() {
      this.emails = { send: resendSend };
    }
  },
}));

process.env.RESEND_API_KEY = "re_test_key";
process.env.EMAIL_FROM_ADDRESS = "orders@send.karan-satha.com";
process.env.EMAIL_FROM_NAME = "Home Cake";

const { sendEmail } = await import("../services/email/emailClient.js");

describe("sendEmail customer recipient handling", () => {
  beforeEach(() => {
    resendSend.mockReset();
    resendSend.mockResolvedValue({ data: { id: "email_test_123" }, error: null });
  });

  test("sends to the supplied customer address and keeps the configured sender", async () => {
    const result = await sendEmail({
      to: "Customer.Example@example.com ",
      subject: "Order confirmed",
      html: "<p>Thanks</p>",
      text: "Thanks",
    });

    expect(result).toEqual({ success: true, id: "email_test_123" });
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "Home Cake <orders@send.karan-satha.com>",
      to: "Customer.Example@example.com",
    }));
  });

  test("does not call Resend for an invalid recipient", async () => {
    const result = await sendEmail({ to: "not-an-email", subject: "Order confirmed", html: "<p>Hi</p>" });

    expect(result).toMatchObject({ success: false, error: "A valid recipient email address is required" });
    expect(resendSend).not.toHaveBeenCalled();
  });
});
