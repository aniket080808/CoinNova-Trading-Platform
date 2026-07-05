import { Resend } from "resend";
import { config } from "../config.js";

const resendClient = () => {
  if (!config.email.resendApiKey) return null;
  return new Resend(config.email.resendApiKey);
};

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = resendClient();
  if (!client) {
    console.warn("⚠️  RESEND_API_KEY not configured — skipping send");
    console.log(`[DEV TESTING OTP LOG] ${html}`);
    return false;
  }

  try {
    const resp = await client.emails.send({
      from: config.email.resendFrom,
      to,
      subject,
      html,
    });

    console.log(`📧  Resend email sent to ${to}: ${subject} — id=${resp.id}`);
    return true;
  } catch (err: any) {
    console.warn("📧  Resend SDK send failed:", err?.message || err);
    console.log(`[DEV TESTING OTP LOG] ${html}`);
    return false;
  }
}
