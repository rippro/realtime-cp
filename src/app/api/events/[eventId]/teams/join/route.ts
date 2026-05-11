import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { sha256Hex } from "@/lib/judge/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function teamMemberDocumentId(teamId: string, userId: string): string {
  return [teamId, userId].map((part) => part.replaceAll("_", "__")).join("_");
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  if (!session || session.role !== "solver") {
    return NextResponse.json({ error: "Solver session required" }, { status: 401 });
  }

  const { inviteCode } = (await request.json()) as { inviteCode?: string };
  const normalizedCode = inviteCode?.trim().toUpperCase() ?? "";
  if (!/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/.test(normalizedCode)) {
    return NextResponse.json({ error: "招待コードは4文字で入力してください" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const inviteCodeHash = sha256Hex(normalizedCode);
  const teamsSnap = await db.collection("teams").where("eventId", "==", eventId).get();
  const teamDoc = teamsSnap.docs.find((doc) => doc.data().inviteCodeHash === inviteCodeHash);
  if (!teamDoc) {
    return NextResponse.json({ error: "招待コードが正しくありません" }, { status: 404 });
  }

  const joinedAt = new Date();
  const memberRef = db
    .collection("teamMembers")
    .doc(teamMemberDocumentId(teamDoc.id, session.userId));

  await db.runTransaction(async (tx) => {
    const [userSnap, memberSnap] = await Promise.all([
      tx.get(db.collection("users").doc(session.userId)),
      tx.get(memberRef),
    ]);
    if (!userSnap.exists) throw new Error("User not found");
    if (memberSnap.exists) return;

    tx.create(memberRef, {
      teamId: teamDoc.id,
      userId: session.userId,
      role: "solver",
      joinedAt: Timestamp.fromDate(joinedAt),
    });
  });

  const team = teamDoc.data();
  return NextResponse.json({
    id: teamDoc.id,
    eventId,
    name: String(team.name ?? ""),
    createdAt:
      team.createdAt instanceof Timestamp
        ? team.createdAt.toDate().toISOString()
        : new Date(0).toISOString(),
  });
}
