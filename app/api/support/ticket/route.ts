import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const rl = rateLimit(`ticket:${getClientIp(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = (body.subject || "").trim();
  const message = (body.message || "").trim();
  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }
  if (subject.length < 4 || message.length < 10) {
    return NextResponse.json({ error: "Please add a bit more detail." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to open a ticket." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({ user_id: user.id, subject, status: "open" })
    .select("id")
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Could not create the ticket." }, { status: 500 });
  }

  await admin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender: "user",
    message,
  });

  return NextResponse.json({ ok: true, id: ticket.id });
}
