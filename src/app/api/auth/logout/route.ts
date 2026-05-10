import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(clearSessionCookieOptions());
  return NextResponse.json({ ok: true });
}
