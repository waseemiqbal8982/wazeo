import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Top-up request: creates a pending payment record (admin approves the proof,
// mirroring the existing Add Funds flow). No money moves automatically.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`topup:${ip}`, 5, 60000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "A positive amount is required." }, { status: 400 });
  }
  if (amount > 100000) {
    return NextResponse.json({ error: "Amount exceeds maximum." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const method = String(body.method || "manual").slice(0, 40);

  const { data, error } = await supabase
    .from("payments")
    .insert({ user_id: user.id, amount, method, status: "pending" })
    .select("id, amount, method, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, payment: data }, { status: 201 });
}
