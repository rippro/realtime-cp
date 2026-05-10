import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { generateCliToken, sha256Hex, newId } from "@/lib/judge/crypto";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId: raw } = await params;
  const eventId = decodeURIComponent(raw);

  const session = await getSession();
  if (!session || session.role !== "solver") {
    return NextResponse.json({ error: "Solver session required" }, { status: 401 });
  }

  const db = getAdminFirestore();

  // Find solver's team in this event
  const membershipsSnap = await db
    .collection("teamMembers")
    .where("userId", "==", session.userId)
    .get();

  let teamId: string | null = null;
  let teamName: string | null = null;
  for (const doc of membershipsSnap.docs) {
    const tid = doc.data().teamId as string;
    const teamSnap = await db.collection("teams").doc(tid).get();
    if (teamSnap.exists && teamSnap.data()?.eventId === eventId) {
      teamId = tid;
      teamName = (teamSnap.data()?.name as string) ?? tid;
      break;
    }
  }

  if (!teamId) {
    return NextResponse.json({ token: null, teamId: null, teamName: null });
  }

  // Return existing token if any
  const existingSnap = await db
    .collection("cliTokens")
    .where("userId", "==", session.userId)
    .where("teamId", "==", teamId)
    .where("revokedAt", "==", null)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    const data = doc?.data() ?? {};
    const tokenPlain = typeof data.tokenPlain === "string" ? data.tokenPlain : null;
    return NextResponse.json({ token: tokenPlain, teamId, teamName });
  }

  // Auto-create token
  const plainToken = generateCliToken();
  const tokenHash = sha256Hex(plainToken);
  const tokenId = newId();
  const createdAt = Timestamp.fromDate(new Date());

  await db.runTransaction(async (tx) => {
    const uniqueRef = db.collection("_unique").doc(`cliTokens:tokenHash:${tokenHash}`);
    tx.create(uniqueRef, { tokenId });
    tx.create(db.collection("cliTokens").doc(tokenId), {
      userId: session.userId,
      teamId,
      tokenHash,
      tokenPlain: plainToken,
      label: "setup",
      expiresAt: null,
      lastUsedAt: null,
      createdAt,
      revokedAt: null,
    });
  });

  return NextResponse.json({ token: plainToken, teamId, teamName });
}
