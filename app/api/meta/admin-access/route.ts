import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await isAdminUser();
  return NextResponse.json({ admin: !!ok });
}
