export type SessionRole = "admin" | "creator" | "solver";

export interface GoogleSession {
  role: "admin" | "creator";
  uid: string;
  email: string;
  name: string;
}

export interface SolverSession {
  role: "solver";
  userId: string;
}

export type Session = GoogleSession | SolverSession;

export function getSessionDisplayName(session: Session): string {
  if (session.role === "solver") return session.userId;
  return session.name || session.email;
}
