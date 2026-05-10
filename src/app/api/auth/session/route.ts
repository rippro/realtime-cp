import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie, sessionCookieOptions } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { GoogleSession } from "@/lib/auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    // Ensure Firebase Admin is initialized before calling getAuth()
    getAdminFirestore();

    let decoded: Awaited<ReturnType<ReturnType<typeof getAuth>["verifyIdToken"]>>;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (verifyErr) {
      console.error("verifyIdToken failed:", verifyErr);
      return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
    }

    const email = decoded.email ?? "";
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const role: "admin" | "creator" = adminEmails.includes(email) ? "admin" : "creator";

    const session: GoogleSession = {
      role,
      uid: decoded.uid,
      email,
      name: decoded.name ?? email,
    };

    const token = await createSessionCookie(session);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ role, email, name: session.name });
  } catch (err) {
    console.error("session route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
