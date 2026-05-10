import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccountJson(): Record<string, string> | null {
  // 1. base64-encoded env var (Vercel / CI)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8")) as Record<string, string>;
  }

  // 2. file path (local dev)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "serviceAccountKey.json";
  const absPath = resolve(/*turbopackIgnore: true*/ process.cwd(), serviceAccountPath);
  try {
    return JSON.parse(readFileSync(absPath, "utf-8")) as Record<string, string>;
  } catch {
    return null;
  }
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const json = loadServiceAccountJson();
  if (!json) throw new Error("Firebase service account not configured");

  return initializeApp({
    credential: cert(json as Parameters<typeof cert>[0]),
    ...(json.project_id ? { projectId: json.project_id } : {}),
  });
}

export function getAdminFirestore() {
  const app = getAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
