import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getAdminFirestore();
  const snap = await db.collection("events").orderBy("startsAt", "desc").get();
  const events = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      isActive: d.isActive as boolean,
      startsAt: (d.startsAt as Timestamp).toDate().toISOString(),
      endsAt: (d.endsAt as Timestamp).toDate().toISOString(),
    };
  });
  return NextResponse.json({ events });
}
