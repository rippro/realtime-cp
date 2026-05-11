export type TeamRole = "admin" | "creator" | "solver";
export type JudgeStatus = "AC" | "WA" | "TLE" | "RE" | "CE" | "IE";
export type CompareMode = "trimmed-exact";
export type EventStatus = "waiting" | "live" | "ended";

export interface User {
  id: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  inviteCodeHash: string;
  createdAt: Date;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface CliToken {
  id: string;
  userId: string;
  teamId: string;
  tokenHash: string;
  label: string | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface Event {
  id: string;
  isActive: boolean;
  status: EventStatus;
}

export interface Problem {
  eventId: string;
  id: string;
  title: string;
  statement: string;
  solutionCode: string;
  timeLimitMs: number;
  points: number;
  compareMode: CompareMode;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Testcase {
  id: string;
  eventId: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  orderIndex: number;
  createdAt: Date;
}

export interface Solve {
  teamId: string;
  eventId: string;
  problemId: string;
  solvedAt: Date;
}

export interface AuthenticatedCliToken {
  token: CliToken;
  team: Team;
}

export interface ProblemConfigResponse {
  eventId: string;
  id: string;
  title: string;
  statement: string;
  timeLimitMs: number;
  compareMode: CompareMode;
}

export interface TestcaseResponse {
  id: string;
  input: string;
  expectedOutput: string;
  orderIndex: number;
}

export interface AcSubmissionCaseInput {
  caseId: string;
  status: JudgeStatus;
  timeMs: number;
}

export interface AcSubmissionInput {
  sourceHash: string;
  status: JudgeStatus;
  maxTimeMs: number;
  cases: AcSubmissionCaseInput[];
}

export interface AcSubmissionResponse {
  solved: boolean;
  solvedAt: string;
}
