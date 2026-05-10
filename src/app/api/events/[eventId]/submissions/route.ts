import type { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminFirestore();
  let query = db
    .collection("submissions")
    .where("eventId", "==", eventId)
    .orderBy("createdAt", "desc");

  if (session.role === "solver") {
    query = query.where("userId", "==", session.userId) as typeof query;
  }

  const snap = await query.limit(200).get();
  const submissions = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      userId: d.userId,
      teamId: d.teamId,
      eventId: d.eventId,
      problemId: d.problemId,
      status: d.status,
      maxTimeMs: d.maxTimeMs,
      createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
    };
  });

  return NextResponse.json({ submissions });
}
