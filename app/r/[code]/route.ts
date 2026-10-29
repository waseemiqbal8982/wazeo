import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** /r/<code> -> store the referral code in a 30-day cookie, then go to sign-up. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const clean = (code || "").trim().slice(0, 32);
  const res = NextResponse.redirect(new URL("/sign-up", new URL(_req.url).origin));
  if (clean) {
    res.cookies.set("wazeo-referral", encodeURIComponent(clean), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: "lax",
    });
  }
  return res;
}
