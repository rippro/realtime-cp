import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const eventId = String(body.eventId ?? "");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const db = getAdminFirestore();
  const ref = db.collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.startsAt !== undefined) updates.startsAt = Timestamp.fromDate(new Date(body.startsAt as string));
  if (body.endsAt !== undefined) updates.endsAt = Timestamp.fromDate(new Date(body.endsAt as string));

  await ref.update(updates);
  const updated = await ref.get();
  const d = updated.data()!;
  return NextResponse.json({
    id: eventId,
    isActive: d.isActive,
    startsAt: (d.startsAt as Timestamp).toDate().toISOString(),
    endsAt: (d.endsAt as Timestamp).toDate().toISOString(),
  });
}
