import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { authErrorMessage } from "@/lib/authMessages";

export async function POST(req: Request) {
  const rl = rateLimit(`signin:${getClientIp(req)}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user: data.user });
}
