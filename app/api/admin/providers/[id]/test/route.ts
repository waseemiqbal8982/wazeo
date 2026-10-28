import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { adapterForProvider } from "@/lib/providerRegistry";
import { applyHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const adminOk = await isAdminUser();
  if (adminOk !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id } = await ctx.params;
  const admin = createAdminClient();
  const { data: p } = await admin.from("providers").select("*").eq("id", id).single();
  if (!p) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const adapter = adapterForProvider(p);
  try {
    const t0 = Date.now();
    const balance = await adapter.getBalance();
    const latencyMs = Date.now() - t0;
    const services = await adapter.getServices();

    await admin
      .from("providers")
      .update({
        balance,
        balance_at: new Date().toISOString(),
        balance_stale: false,
        last_ok_at: new Date().toISOString(),
      })
      .eq("id", id);
    await applyHealth(id, true);

    return NextResponse.json({
      ok: true,
      balance,
      currency: p.currency || "USD",
      latencyMs,
      serviceCount: services.length,
      mock: adapter.config.format === "mock",
    });
  } catch (e) {
    await applyHealth(id, false);
    return NextResponse.json({ ok: false, error: `Connection failed: ${String(e)}` }, { status: 502 });
  }
}
