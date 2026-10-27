import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mercuryChat, isMercuryConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

function fallbackAnswer(m: string): string {
  const t = m.toLowerCase();
  if (t.includes("status") || t.includes("kahan") || t.includes("pahunch") || t.includes("order"))
    return "Aapka order process ho raha hai. Agar meaadat se zyada time lage to support team check karegi.";
  if (t.includes("refill") || t.includes("reffill"))
    return "Refill request ke liye ek ticket kholo — team 24–48 ghante me dekhegi.";
  if (t.includes("delivery") || t.includes("time") || t.includes("kitna"))
    return "Zayadatar orders minutes me start hote hain. Delivery service aur provider par depend karti hai.";
  return "Is baare mein certainty se jawab dene ke liye hamara support team aapki madad karega. Zara ticket kholen.";
}

export async function POST(req: Request) {
  let body: { message?: string; orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = (body.message || "").slice(0, 500);
  if (!message.trim()) {
    return NextResponse.json({ reply: "Kya masla hai? Batao." }, { status: 200 });
  }

  // Optional context: only the user's own order.
  let orderInfo = "";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && body.orderId) {
      const { data: o } = await supabase
        .from("orders")
        .select("status, quantity")
        .eq("id", body.orderId)
        .eq("user_id", user.id)
        .single();
      if (o) orderInfo = ` (order status: ${o.status}, quantity: ${o.quantity})`;
    }
  } catch {}

  if (isMercuryConfigured()) {
    const reply = await mercuryChat(
      [
        { role: "system", content: "You are Wazeo's support assistant. Be brief and helpful. If unsure, say you'll escalate to an admin." },
        { role: "user", content: `Question: ${message}${orderInfo}` },
      ],
      { maxTokens: 120 }
    );
    if (reply) return NextResponse.json({ reply });
  }

  return NextResponse.json({ reply: fallbackAnswer(message) });
}
