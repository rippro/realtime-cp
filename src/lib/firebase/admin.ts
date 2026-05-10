import { readFileSync } from "fs";
import { resolve } from "path";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "serviceAccountKey.json";
  const absPath = resolve(process.cwd(), serviceAccountPath);

  try {
    const json = JSON.parse(readFileSync(absPath, "utf-8")) as Record<string, string>;
    const projectId = json.project_id;
    return initializeApp({
      credential: cert(json as Parameters<typeof cert>[0]),
      ...(projectId ? { projectId } : {}),
    });
  } catch {
    return initializeApp({ credential: applicationDefault() });
  }
}

export function getAdminFirestore() {
  const app = getAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
