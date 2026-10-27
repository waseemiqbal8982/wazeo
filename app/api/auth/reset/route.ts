import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const rl = rateLimit(`reset:${getClientIp(req)}`, 4, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = body.password || "";
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return NextResponse.json({ error: "Could not update password. Please request a new reset link." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
