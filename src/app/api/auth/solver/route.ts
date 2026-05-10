import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie, sessionCookieOptions } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/judge/crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { SolverSession } from "@/lib/auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { userId, password } = (await request.json()) as { userId: string; password: string };
    if (!userId || !password) {
      return NextResponse.json({ error: "userId and password required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const snap = await db.collection("users").doc(userId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const data = snap.data() as { passwordHash: string };
    const valid = await verifyPassword(password, data.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session: SolverSession = { role: "solver", userId };
    const token = await createSessionCookie(session);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ role: "solver", userId });
  } catch (err) {
    console.error("solver login error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
