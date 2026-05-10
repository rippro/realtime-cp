import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookie, sessionCookieOptions } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { GoogleSession } from "@/lib/auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminAuth() {
  const app = getApps()[0];
  if (!app) throw new Error("Firebase Admin not initialized");
  return getAuth(app);
}

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    // Initialize admin if needed
    const db = getAdminFirestore();
    void db;

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const email = decoded.email ?? "";
    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
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
    console.error("session error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
