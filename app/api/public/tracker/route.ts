import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public order tracker: shows only safe order metadata by order ID.
// No user identity, link, or cost is ever exposed.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Order ID is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, status, quantity, created_at, services(platform)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const platform = (data.services as unknown as { platform?: string } | null)?.platform || "instagram";

  return NextResponse.json({
    status: data.status,
    quantity: Number(data.quantity || 0),
    platform,
    created: new Date(data.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  });
}
