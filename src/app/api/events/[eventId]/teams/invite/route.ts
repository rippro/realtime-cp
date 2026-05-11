import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  if (!session || session.role !== "solver") {
    return NextResponse.json({ error: "Solver session required" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const membershipsSnap = await db
    .collection("teamMembers")
    .where("userId", "==", session.userId)
    .get();

  for (const membershipDoc of membershipsSnap.docs) {
    const teamId = String(membershipDoc.data().teamId ?? "");
    if (!teamId) continue;

    const teamSnap = await db.collection("teams").doc(teamId).get();
    if (!teamSnap.exists || teamSnap.data()?.eventId !== eventId) continue;

    const inviteCodeSnap = await db.collection("_teamInviteCodes").doc(teamId).get();
    const inviteCode = inviteCodeSnap.data()?.inviteCode;
    return NextResponse.json({
      teamId,
      teamName: String(teamSnap.data()?.name ?? teamId),
      inviteCode: typeof inviteCode === "string" ? inviteCode : null,
    });
  }

  return NextResponse.json({ teamId: null, teamName: null, inviteCode: null });
}
