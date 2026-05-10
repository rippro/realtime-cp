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
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  if (!session || session.role !== "solver") {
    return NextResponse.json({ error: "Solver session required" }, { status: 401 });
  }

  const { name } = (await request.json()) as { name: string };
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const db = getAdminFirestore();

  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { generateInviteCode, sha256Hex, newId } = await import("@/lib/judge/crypto");
  const inviteCode = generateInviteCode();
  const teamId = newId();
  const createdAt = new Date();

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(db.collection("users").doc(session.userId));
    if (!userSnap.exists) throw new Error("User not found");

    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = db.collection("teamMembers").doc(
      [teamId, session.userId].map((s) => s.replaceAll("_", "__")).join("_"),
    );

    tx.create(teamRef, {
      eventId,
      name: name.trim(),
      inviteCodeHash: sha256Hex(inviteCode),
      createdAt: Timestamp.fromDate(createdAt),
    });
    tx.create(memberRef, {
      teamId,
      userId: session.userId,
      role: "solver",
      joinedAt: Timestamp.fromDate(createdAt),
    });
  });

  return NextResponse.json(
    { id: teamId, eventId, name: name.trim(), createdAt: createdAt.toISOString(), inviteCode },
    { status: 201 },
  );
}
