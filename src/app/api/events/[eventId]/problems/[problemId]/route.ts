import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { newId } from "@/lib/judge/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function docId(eventId: string, problemId: string) {
  return `${eventId}_${problemId}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; problemId: string }> },
) {
  const { eventId: _rawEventId, problemId: _rawProblemId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const problemId = decodeURIComponent(_rawProblemId);
  const session = await getSession();
  const db = getAdminFirestore();
  const snap = await db.collection("problems").doc(docId(eventId, problemId)).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data();
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!d.isPublished && (!session || session.role === "solver")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let testcasesQuery = db
    .collection("testcases")
    .where("eventId", "==", eventId)
    .where("problemId", "==", problemId);
  if (!session || session.role === "solver") {
    testcasesQuery = testcasesQuery.where("type", "==", "sample") as typeof testcasesQuery;
  }
  const testcasesSnap = await testcasesQuery.orderBy("orderIndex", "asc").get();

  return NextResponse.json({
    eventId: d.eventId,
    id: d.id,
    title: d.title,
    statement: d.statement,
    solutionCode: d.solutionCode ?? "",
    timeLimitMs: d.timeLimitMs,
    compareMode: d.compareMode,
    isPublished: d.isPublished,
    creatorUid: d.creatorUid ?? null,
    testcases: testcasesSnap.docs.map((doc) => {
      const testcase = doc.data();
      return {
        id: doc.id,
        type: testcase.type,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        orderIndex: testcase.orderIndex,
      };
    }),
    createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; problemId: string }> },
) {
  const { eventId: _rawEventId, problemId: _rawProblemId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const problemId = decodeURIComponent(_rawProblemId);
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "creator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const ref = db.collection("problems").doc(docId(eventId, problemId));
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data();
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "creator" && d.creatorUid !== session.uid) {
    return NextResponse.json({ error: "Forbidden: not your problem" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: Timestamp.fromDate(new Date()) };

  const fields = ["title", "statement", "solutionCode", "compareMode"];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.timeLimitMs !== undefined) updates.timeLimitMs = Number(body.timeLimitMs);
  if (body.isPublished !== undefined) updates.isPublished = Boolean(body.isPublished);

  const batch = db.batch();
  batch.update(ref, updates);
  if (body.testcases !== undefined) {
    const existingTestcases = await db
      .collection("testcases")
      .where("eventId", "==", eventId)
      .where("problemId", "==", problemId)
      .get();
    for (const testcaseDoc of existingTestcases.docs) {
      batch.delete(testcaseDoc.ref);
    }
    for (const testcase of readTestcases(body.testcases)) {
      const testcaseId = newId();
      batch.create(db.collection("testcases").doc(testcaseId), {
        id: testcaseId,
        eventId,
        problemId,
        type: testcase.type,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        showOnFailure: testcase.type === "sample",
        orderIndex: testcase.orderIndex,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }
  await batch.commit();
  const updated = await ref.get();
  const ud = updated.data();
  if (!ud) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const { eventId: _rawEventId, problemId: _rawProblemId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const problemId = decodeURIComponent(_rawProblemId);
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "creator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const ref = db.collection("problems").doc(docId(eventId, problemId));
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = snap.data();
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "creator" && d.creatorUid !== session.uid) {
    return NextResponse.json({ error: "Forbidden: not your problem" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}

function readTestcases(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const type = record.type === "hidden" ? "hidden" : "sample";
      const input = String(record.input ?? "");
      const expectedOutput = String(record.expectedOutput ?? "");
      if (!input && !expectedOutput) return null;
      return { type, input, expectedOutput, orderIndex: index };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
