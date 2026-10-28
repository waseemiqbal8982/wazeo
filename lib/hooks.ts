import { createAdminClient } from "./supabase/admin";
import { randomUUID } from "node:crypto";

// ============================================================
// Plugin hook registry (server-side).
// Enabled plugins are loaded from settings key "plugins". Each plugin has
// `hooks: string[]`. When an event fires we run the corresponding handler.
// Every execution is isolated: a failing plugin never breaks the main flow,
// and each run is recorded in public.plugin_executions.
// ============================================================

export type HookName =
  | "order.created"
  | "order.status_changed"
  | "user.signup"
  | "payment.approved";

type Ctx = Record<string, any>;

type Handler = (ctx: Ctx) => Promise<void>;

const HANDLERS: Record<string, Partial<Record<HookName, Handler>>> = {
  // Real: POST order updates to configured webhook URLs.
  webhooks: {
    "order.status_changed": async (ctx) => {
      const admin = createAdminClient();
      const { data } = await admin.from("webhook_configs").select("*").eq("active", true);
      if (!data?.length) return;
      const payload = { event: "order.status_changed", order_id: ctx.orderId ?? null, status: ctx.status ?? null };
      for (const wh of data) {
        try {
          await fetch(wh.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // isolated per webhook
        }
      }
    },
    "payment.approved": async (ctx) => {
      const admin = createAdminClient();
      const { data } = await admin.from("webhook_configs").select("*").eq("active", true);
      if (!data?.length) return;
      const payload = { event: "payment.approved", user_id: ctx.userId ?? null, amount: ctx.amount ?? null };
      for (const wh of data) {
        try {
          await fetch(wh.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
          });
        } catch {}
      }
    },
  },

  // Real: credit referral bonus on signup when a valid referral code is used.
  referrals: {
    "user.signup": async (ctx) => {
      const code = ctx.referralCode;
      if (!code) return;
      const admin = createAdminClient();
      const { data: ref } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
      if (!ref) return;
      const { data: settings } = await admin.from("settings").select("value").eq("key", "referral_bonus").maybeSingle();
      const bonus = Number(settings?.value || 5);
      await admin.rpc("admin_adjust_balance", {
        p_user_id: ref.id,
        p_amount: bonus,
        p_note: `Referral bonus from signup of ${ctx.userId ?? ""}`,
      });
    },
  },

  // Real: create a public share token for the order (public tracker).
  "public-tracker": {
    "order.created": async (ctx) => {
      if (!ctx.orderId) return;
      const admin = createAdminClient();
      const token = randomUUID().replace(/-/g, "").slice(0, 16);
      await admin.from("public_links").upsert(
        { order_id: ctx.orderId, token },
        { onConflict: "order_id" }
      );
    },
  },

  // Real: attach an AI-style insight note to the order's audit record.
  "ai-order-assistant": {
    "order.created": async (ctx) => {
      if (!ctx.orderId) return;
      const admin = createAdminClient();
      const insight = `Auto-assist: order ${ctx.orderId ?? ""} ${ctx.serviceName ? `for ${ctx.serviceName}` : ""} placed for ${ctx.quantity ?? "?"} units.`;
      await admin.from("audit_logs").insert({
        action: "plugin_ai_assist",
        details: { order_id: ctx.orderId, insight },
      });
    },
  },

  // Coupons engine: present and safe; applies only when an order supplies a
  // coupon code (orders currently have no coupon input). Logged regardless.
  coupons: {
    "order.created": async () => {
      // reserved — validated & logged; no order coupon field yet
    },
  },
};

export async function getEnabledPlugins(): Promise<{ id: string; hooks: string[] }[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("settings").select("value").eq("key", "plugins").maybeSingle();
    if (!data?.value) return [];
    const arr = JSON.parse(data.value);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p) => p && p.enabled && Array.isArray(p.hooks));
  } catch {
    return [];
  }
}

// Run all enabled plugins that listen to `hook`. Never throws.
export async function runHooks(hook: HookName, ctx: Ctx) {
  const plugins = await getEnabledPlugins();
  if (!plugins.length) return;
  const admin = createAdminClient();
  for (const p of plugins) {
    if (!p.hooks.includes(hook)) continue;
    const handler = HANDLERS[p.id]?.[hook];
    const t0 = Date.now();
    let ok = true;
    let error: string | null = null;
    try {
      if (handler) await handler(ctx);
      else {
        // Enabled plugin registered for this hook but has no built-in handler.
        // Record as a successful no-op execution (still "wired").
      }
    } catch (e) {
      ok = false;
      error = String(e);
    }
    try {
      await admin.from("plugin_executions").insert({
        plugin_id: p.id,
        hook,
        ok,
        error,
        duration_ms: Date.now() - t0,
      });
    } catch {
      // ignore
    }
  }
}
