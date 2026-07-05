import { config } from "../config.js";
export async function sendEmail(to, subject, html) {
    if (!config.email.resendApiKey) {
        console.warn("⚠️  RESEND_API_KEY not configured — skipping send");
        console.log(`[DEV TESTING OTP LOG] ${html}`);
        return false;
    }
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.email.resendApiKey}`,
            },
            body: JSON.stringify({
                from: config.email.resendFrom,
                to,
                subject,
                html,
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            console.warn(`📧  Resend API error: ${res.status} ${res.statusText} ${body}`);
            console.log(`[DEV TESTING OTP LOG] ${html}`);
            return false;
        }
        console.log(`📧  Resend email sent to ${to}: ${subject}`);
        console.log(`[DEV TESTING OTP LOG] ${html}`);
        return true;
    }
    catch (err) {
        console.warn("📧  Resend request failed:", err?.message || err);
        console.log(`[DEV TESTING OTP LOG] ${html}`);
        return false;
    }
}
