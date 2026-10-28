import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { providerGetBalance, isMockMode } from "@/lib/provider";

export const dynamic = "force-dynamic";

// Test-connection for an SMM API provider. In mock mode (no PROVIDER_API_URL/
// KEY configured) it reports a healthy demo result. In live mode it makes a
// real balance request against the configured provider endpoint.
export async function POST() {
  const adminOk = await isAdminUser();
  if (adminOk !== true) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  try {
    const balance = await providerGetBalance();
    return NextResponse.json({
      ok: true,
      balance,
      mock: isMockMode(),
      message: isMockMode()
        ? "Mock mode — provider API not configured. Balance is a demo value."
        : "Connected. Provider balance retrieved successfully.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Connection failed: ${String(e)}` },
      { status: 502 }
    );
  }
}
