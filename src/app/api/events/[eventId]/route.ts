import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const db = getAdminFirestore();

  const [eventSnap, problemsSnap, teamsSnap] = await Promise.all([
    db.collection("events").doc(eventId).get(),
    db.collection("problems").where("eventId", "==", eventId).get(),
    db.collection("teams").where("eventId", "==", eventId).get(),
  ]);

  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const d = eventSnap.data()!;
  return NextResponse.json({
    id: eventSnap.id,
    isActive: d.isActive as boolean,
    startsAt: (d.startsAt as Timestamp).toDate().toISOString(),
    endsAt: (d.endsAt as Timestamp).toDate().toISOString(),
    problemCount: problemsSnap.size,
    teamCount: teamsSnap.size,
  });
}
