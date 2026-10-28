import { createAdminClient } from "./supabase/admin";
import { getSettingInt } from "./settings";
import { validateProviderUrl } from "./ssrf";
import { sendEmail } from "./email";
import { adminEmails } from "./adminAuth";

const ALPHA = 0.3; // EWMA smoothing for rolling error rate

export interface HealthResult {
  changedStatus?: "paused" | "active";
  paused?: boolean;
  resumed?: boolean;
}

// Record a success/failure for a provider and decide auto-pause/resume.
export async function applyHealth(providerId: string, ok: boolean): Promise<HealthResult> {
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .single();
  if (!p) return {};

  const pauseStreak = await getSettingInt("health_pause_streak", 5);
  const resumeSuccesses = await getSettingInt("health_resume_successes", 10);

  const curRate = Number(p.error_rate) || 0;
  const nextRate = ok
    ? Math.max(0, curRate * (1 - ALPHA))
    : Math.min(1, curRate * (1 - ALPHA) + ALPHA);
  const streak = ok ? 0 : Number(p.error_streak || 0) + 1;
  const run = ok ? Number(p.success_run || 0) + 1 : 0;

  const patch: Record<string, unknown> = {
    error_rate: Math.round(nextRate * 10000) / 10000,
    error_streak: streak,
    success_run: run,
  };
  if (ok) patch.last_ok_at = new Date().toISOString();

  let changedStatus: "paused" | "active" | undefined;
  if (!ok && streak >= pauseStreak && p.status === "active") {
    patch.status = "paused";
    changedStatus = "paused";
  } else if (ok && run >= resumeSuccesses && p.status === "paused") {
    patch.status = "active";
    changedStatus = "active";
  }

  await admin.from("providers").update(patch).eq("id", providerId);

  if (changedStatus === "paused") {
    await sendAlert("provider_auto_paused", {
      event: "provider_auto_paused",
      provider_id: providerId,
      provider_name: p.name,
      message: `Provider "${p.name}" auto-paused after ${streak} consecutive errors.`,
    });
  } else if (changedStatus === "active") {
    await sendAlert("provider_resumed", {
      event: "provider_resumed",
      provider_id: providerId,
      provider_name: p.name,
      message: `Provider "${p.name}" auto-resumed after ${run} consecutive successes.`,
    });
  }

  return { changedStatus, paused: changedStatus === "paused", resumed: changedStatus === "active" };
}

// Alert admins via configured webhooks (SSRF-validated) + email. Best-effort.
export async function sendAlert(event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: hooks } = await admin
      .from("webhook_configs")
      .select("*")
      .eq("event", event)
      .eq("active", true);

    for (const h of hooks || []) {
      const v = await validateProviderUrl(String(h.url));
      if (!v.ok) continue;
      try {
        const res = await fetch(String(h.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, ts: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000),
        });
        await admin
          .from("webhook_configs")
          .update({ last_status: res.status, last_sent_at: new Date().toISOString() })
          .eq("id", h.id);
      } catch {
        // best effort
      }
    }
  } catch {
    // best effort
  }

  const emails = adminEmails();
  if (emails.length) {
    await sendEmail({
      to: emails[0],
      subject: `[Wazeo] ${event}`,
      html: `<p>${String(payload.message || event)}</p><pre>${JSON.stringify(
        payload,
        null,
        2
      )}</pre>`,
    });
  }
}
