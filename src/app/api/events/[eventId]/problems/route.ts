import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await getSession();
  const db = getAdminFirestore();

  let query = db.collection("problems").where("eventId", "==", eventId);
  if (!session || session.role === "solver") {
    query = query.where("isPublished", "==", true) as typeof query;
  }

  const snap = await query.orderBy("id", "asc").get();
  const problems = snap.docs.map((doc) => {
    const d = doc.data();
    return {
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
    };
  });

  return NextResponse.json({ problems });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "creator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const now = new Date();
  const db = getAdminFirestore();

  const problemId = String(body.id ?? "").trim();
  if (!problemId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const docId = `${eventId}_${problemId}`;
  const data = {
    eventId,
    id: problemId,
    title: String(body.title ?? ""),
    statement: String(body.statement ?? ""),
    constraints: String(body.constraints ?? ""),
    inputFormat: String(body.inputFormat ?? ""),
    outputFormat: String(body.outputFormat ?? ""),
    allowedLanguages: Array.isArray(body.allowedLanguages) ? body.allowedLanguages : ["cpp", "python"],
    timeLimitMs: Number(body.timeLimitMs ?? 2000),
    compareMode: "trimmed-exact",
    testcaseVersion: String(body.testcaseVersion ?? "v1"),
    isPublished: Boolean(body.isPublished ?? false),
    creatorUid: session.role === "creator" ? session.uid : (session.role === "admin" ? session.uid : null),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };

  await db.collection("problems").doc(docId).create(data);
  return NextResponse.json({ ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() }, { status: 201 });
}
