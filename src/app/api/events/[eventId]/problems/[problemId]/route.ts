import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function docId(eventId: string, problemId: string) {
  return `${eventId}_${problemId}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; problemId: string }> },
) {
  const { eventId, problemId } = await params;
  const session = await getSession();
  const db = getAdminFirestore();
  const snap = await db.collection("problems").doc(docId(eventId, problemId)).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data()!;
  if (!d.isPublished && (!session || session.role === "solver")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    eventId: d.eventId,
    id: d.id,
    title: d.title,
    statement: d.statement,
    constraints: d.constraints,
    inputFormat: d.inputFormat,
    outputFormat: d.outputFormat,
    allowedLanguages: d.allowedLanguages,
    timeLimitMs: d.timeLimitMs,
    compareMode: d.compareMode,
    testcaseVersion: d.testcaseVersion,
    isPublished: d.isPublished,
    creatorUid: d.creatorUid ?? null,
    createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; problemId: string }> },
) {
  const { eventId, problemId } = await params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "creator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const ref = db.collection("problems").doc(docId(eventId, problemId));
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data()!;
  if (session.role === "creator" && d.creatorUid !== session.uid) {
    return NextResponse.json({ error: "Forbidden: not your problem" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: Timestamp.fromDate(new Date()) };

  const fields = ["title", "statement", "constraints", "inputFormat", "outputFormat", "testcaseVersion", "compareMode"];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.allowedLanguages !== undefined) updates.allowedLanguages = body.allowedLanguages;
  if (body.timeLimitMs !== undefined) updates.timeLimitMs = Number(body.timeLimitMs);
  if (body.isPublished !== undefined) updates.isPublished = Boolean(body.isPublished);

  await ref.update(updates);
  const updated = await ref.get();
  const ud = updated.data()!;
  return NextResponse.json({
    ...ud,
    createdAt: (ud.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (ud.updatedAt as Timestamp).toDate().toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; problemId: string }> },
) {
  const { eventId, problemId } = await params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "creator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const ref = db.collection("problems").doc(docId(eventId, problemId));
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data()!;
  if (session.role === "creator" && d.creatorUid !== session.uid) {
    return NextResponse.json({ error: "Forbidden: not your problem" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
