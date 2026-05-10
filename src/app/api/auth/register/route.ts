import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie, sessionCookieOptions } from "@/lib/auth/session";
import { hashPassword } from "@/lib/judge/crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { SolverSession } from "@/lib/auth/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(userId)) {
    return NextResponse.json({ available: false });
  }
  const db = getAdminFirestore();
  const snap = await db.collection("users").doc(userId).get();
  return NextResponse.json({ available: !snap.exists });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { userId, password } = (await request.json()) as { userId: string; password: string };
    if (!userId || !password) {
      return NextResponse.json({ error: "userId and password required" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(userId)) {
      return NextResponse.json(
        { error: "IDは2〜64文字、英数字・アンダースコア・ハイフンのみ" },
        { status: 400 },
      );
    }
    if (password.length < 3) {
      return NextResponse.json({ error: "パスワードは3文字以上" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const existing = await db.collection("users").doc(userId).get();
    if (existing.exists) {
      return NextResponse.json({ error: "そのIDは既に使われています" }, { status: 409 });
    }

    const createdAt = new Date();
    await db.collection("users").doc(userId).create({
      passwordHash: await hashPassword(password),
      createdAt: Timestamp.fromDate(createdAt),
    });

    const session: SolverSession = { role: "solver", userId };
    const token = await createSessionCookie(session);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ role: "solver", userId }, { status: 201 });
  } catch (err) {
    console.error("solver register error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
