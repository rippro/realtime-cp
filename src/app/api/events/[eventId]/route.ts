import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStatus(value: unknown, fallbackIsActive = false) {
  if (value === "waiting" || value === "live" || value === "ended") return value;
  return fallbackIsActive ? "live" : "waiting";
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const db = getAdminFirestore();

  const [eventSnap, problemsSnap, teamsSnap] = await Promise.all([
    db.collection("events").doc(eventId).get(),
    db.collection("problems").where("eventId", "==", eventId).get(),
    db.collection("teams").where("eventId", "==", eventId).get(),
  ]);

  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const d = eventSnap.data();
  if (!d) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: eventSnap.id,
    isActive: d.isActive as boolean,
    status: normalizeStatus(d.status, Boolean(d.isActive)),
    problemCount: problemsSnap.size,
    teamCount: teamsSnap.size,
  });
}
