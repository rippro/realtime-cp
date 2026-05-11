import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const eventId = String(body.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const db = getAdminFirestore();
  const ref = db.collection("events").doc(eventId);
  if ((await ref.get()).exists)
    return NextResponse.json({ error: "Event already exists" }, { status: 409 });

  const data = {
    isActive: Boolean(body.isActive ?? false),
  };
  await ref.set(data);
  return NextResponse.json({ id: eventId, isActive: data.isActive }, { status: 201 });
}

async function batchDelete(
  db: ReturnType<typeof getAdminFirestore>,
  refs: FirebaseFirestore.DocumentReference[],
) {
  // Firestore batch limit = 500
  for (let i = 0; i < refs.length; i += 500) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + 500)) batch.delete(ref);
    await batch.commit();
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const eventId = String(body.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const db = getAdminFirestore();

  const [teamsSnap, problemsSnap, testcasesSnap, solvesSnap] = await Promise.all([
    db.collection("teams").where("eventId", "==", eventId).get(),
    db.collection("problems").where("eventId", "==", eventId).get(),
    db.collection("testcases").where("eventId", "==", eventId).get(),
    db.collection("solves").where("eventId", "==", eventId).get(),
  ]);

  const teamIds = teamsSnap.docs.map((d) => d.id);

  const [teamMembersSnaps, cliTokensSnaps] = await Promise.all([
    Promise.all(
      teamIds.map((tid) => db.collection("teamMembers").where("teamId", "==", tid).get()),
    ),
    Promise.all(teamIds.map((tid) => db.collection("cliTokens").where("teamId", "==", tid).get())),
  ]);

  const refs: FirebaseFirestore.DocumentReference[] = [
    db.collection("events").doc(eventId),
    ...teamsSnap.docs.map((d) => d.ref),
    ...problemsSnap.docs.map((d) => d.ref),
    ...testcasesSnap.docs.map((d) => d.ref),
    ...solvesSnap.docs.map((d) => d.ref),
    ...teamMembersSnaps.flatMap((s) => s.docs.map((d) => d.ref)),
    ...teamIds.map((tid) => db.collection("_teamInviteCodes").doc(tid)),
  ];

  const cliTokenDocs = cliTokensSnaps.flatMap((s) => s.docs);
  for (const doc of cliTokenDocs) {
    refs.push(doc.ref);
    const hash = doc.data().tokenHash as string | undefined;
    if (hash) refs.push(db.collection("_unique").doc(`cliTokens:tokenHash:${hash}`));
  }

  await batchDelete(db, refs);
  return NextResponse.json({ ok: true });
}

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

  await ref.update(updates);
  const updated = await ref.get();
  const d = updated.data();
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: eventId, isActive: d.isActive as boolean });
}
