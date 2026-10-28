import { createAdminClient } from "./supabase/admin";

// Best-effort transactional email. Uses Resend HTTP API when a key is
// available (env RESEND_API_KEY or SMTP password stored in settings). Returns
// true only if the email was actually dispatched.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  let from = "Wazeo <support@innvera.shop>";
  let smtpPass = "";
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("settings").select("value").eq("key", "smtp_from").maybeSingle();
    if (data?.value) from = String(data.value);
    const { data: pass } = await admin.from("settings").select("value").eq("key", "smtp_pass").maybeSingle();
    smtpPass = String(pass?.value || "");
  } catch {}

  const resendKey = process.env.RESEND_API_KEY || (smtpPass ? "resend-smtp-password" : "");
  if (!resendKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
