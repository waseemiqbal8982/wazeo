import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: { currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currency = (body.currency || "").toUpperCase();
  if (!["USD", "INR", "PKR", "CNY"].includes(currency)) {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "Please verify your email first." }, { status: 403 });
  }

  await supabase.rpc("update_profile", { p_currency: currency });

  return NextResponse.json({ ok: true });
}
