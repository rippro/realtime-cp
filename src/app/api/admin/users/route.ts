import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
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
