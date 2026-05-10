import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminFirestore();
  const [teamsSnap, solvesSnap] = await Promise.all([
    db.collection("teams").where("eventId", "==", eventId).get(),
    db.collection("solves").where("eventId", "==", eventId).get(),
  ]);

  const solvesByTeam = new Map<string, number>();
  for (const doc of solvesSnap.docs) {
    const tid = doc.data().teamId as string;
    solvesByTeam.set(tid, (solvesByTeam.get(tid) ?? 0) + 1);
  }

  const teams = teamsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      eventId: d.eventId,
      name: d.name,
      createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      solveCount: solvesByTeam.get(doc.id) ?? 0,
    };
  });

  teams.sort((a, b) => b.solveCount - a.solveCount || a.name.localeCompare(b.name));
  return NextResponse.json({ teams });
}
