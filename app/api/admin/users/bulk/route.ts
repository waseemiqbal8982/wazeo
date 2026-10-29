import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["user", "admin", "support"];

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: { action?: string; userIds?: string[]; value?: string | number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;
  const ids = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
  if (!action || !ids.length) {
    return NextResponse.json({ error: "action and userIds required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: me } = await admin.auth.getUser().catch(() => ({ data: null }));
  const myId = me?.user?.id;

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of ids) {
    try {
      if (action === "ban") {
        await admin.from("profiles").update({ banned: true }).eq("id", id);
      } else if (action === "unban") {
        await admin.from("profiles").update({ banned: false }).eq("id", id);
      } else if (action === "add_balance" || action === "deduct_balance") {
        const amt = Math.abs(Number(body.value) || 0);
        if (!amt) throw new Error("Amount required");
        await admin.rpc("admin_adjust_balance", {
          p_user_id: id,
          p_amount: action === "add_balance" ? amt : -amt,
          p_note: `Admin bulk ${action}`,
        });
      } else if (action === "mark_verified") {
        const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
        if (error) throw new Error(error.message);
      } else if (action === "set_role") {
        const role = String(body.value || "");
        if (!ALLOWED_ROLES.includes(role)) throw new Error("Invalid role");
        if (id === myId) throw new Error("Cannot change your own role");
        await admin.from("profiles").update({ role }).eq("id", id);
      } else {
        throw new Error("Unknown action");
      }

      await admin.from("audit_logs").insert({
        user_id: id,
        action: `admin_bulk_${action}`,
        details: { by: myId, value: body.value ?? null },
      });
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
