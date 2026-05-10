import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/judge/crypto";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminFirestore();
  const snap = await db.collection("users").orderBy("createdAt", "desc").get();
  const users = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, password } = (await request.json()) as { userId: string; password: string };
  if (!userId || !password) {
    return NextResponse.json({ error: "userId and password required" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(userId)) {
    return NextResponse.json(
      { error: "userId must be 2-64 characters of letters, numbers, underscore, or hyphen" },
      { status: 400 },
    );
  }
  if (password.length < 3) {
    return NextResponse.json({ error: "password must be at least 3 characters" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const existing = await db.collection("users").doc(userId).get();
  if (existing.exists) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const createdAt = new Date();
  await db.collection("users").doc(userId).create({
    passwordHash: await hashPassword(password),
    createdAt: Timestamp.fromDate(createdAt),
  });

  return NextResponse.json({ id: userId, createdAt: createdAt.toISOString() }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = (await request.json()) as { userId: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = getAdminFirestore();
  await db.collection("users").doc(userId).delete();
  return NextResponse.json({ ok: true });
}
