import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight liveness endpoint for uptime / monitoring probes (e.g. Vercel
// Cron, UptimeRobot, BetterStack). Deliberately DB-free so the probe succeeds
// as long as the server process is healthy.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "wazeo",
    time: new Date().toISOString(),
  });
}
