import { Timestamp } from "firebase-admin/firestore";
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
  const [teamsSnap, solvesSnap, problemsSnap] = await Promise.all([
    db.collection("teams").where("eventId", "==", eventId).get(),
    db.collection("solves").where("eventId", "==", eventId).get(),
    db.collection("problems").where("eventId", "==", eventId).get(),
  ]);

  const pointsByProblem = new Map<string, number>();
  for (const doc of problemsSnap.docs) {
    pointsByProblem.set(doc.data().id as string, (doc.data().points as number | undefined) ?? 100);
  }

  const solvesByTeam = new Map<string, { count: number; points: number }>();
  for (const doc of solvesSnap.docs) {
    const d = doc.data();
    const tid = d.teamId as string;
    const pid = d.problemId as string;
    const prev = solvesByTeam.get(tid) ?? { count: 0, points: 0 };
    solvesByTeam.set(tid, {
      count: prev.count + 1,
      points: prev.points + (pointsByProblem.get(pid) ?? 100),
    });
  }

  const teams = teamsSnap.docs.map((doc) => {
    const d = doc.data();
    const s = solvesByTeam.get(doc.id) ?? { count: 0, points: 0 };
    return {
      id: doc.id,
      eventId: d.eventId,
      name: d.name,
      createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      solveCount: s.count,
      totalPoints: s.points,
    };
  });

  teams.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  return NextResponse.json({ teams });
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
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
  const existingTeamsSnap = await db.collection("teams").where("eventId", "==", eventId).get();
  const existingInviteCodeHashes = new Set(
    existingTeamsSnap.docs.map((doc) => String(doc.data().inviteCodeHash ?? "")),
  );
  let inviteCode = "";
  let inviteCodeHash = "";
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const candidate = generateInviteCode();
    const candidateHash = sha256Hex(candidate);
    if (!existingInviteCodeHashes.has(candidateHash)) {
      inviteCode = candidate;
      inviteCodeHash = candidateHash;
      break;
    }
  }
  if (!inviteCode || !inviteCodeHash) {
    return NextResponse.json({ error: "Invite code generation failed" }, { status: 500 });
  }
  const teamId = newId();
  const createdAt = new Date();

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(db.collection("users").doc(session.userId));
    if (!userSnap.exists) throw new Error("User not found");

    const teamRef = db.collection("teams").doc(teamId);
    const inviteCodeRef = db.collection("_teamInviteCodes").doc(teamId);
    const memberRef = db
      .collection("teamMembers")
      .doc([teamId, session.userId].map((s) => s.replaceAll("_", "__")).join("_"));

    tx.create(teamRef, {
      eventId,
      name: name.trim(),
      inviteCodeHash,
      createdAt: Timestamp.fromDate(createdAt),
    });
    tx.create(inviteCodeRef, {
      teamId,
      inviteCode,
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
