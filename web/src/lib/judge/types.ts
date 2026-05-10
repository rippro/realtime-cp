export type TeamRole = "owner" | "member";
export type TestcaseType = "sample" | "hidden";
export type JudgeStatus = "AC" | "WA" | "TLE" | "RE" | "CE" | "IE";
export type CompareMode = "trimmed-exact";

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
  startsAt: Date;
  endsAt: Date;
}

export interface Problem {
  eventId: string;
  id: string;
  title: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  allowedLanguages: string[];
  timeLimitMs: number;
  compareMode: CompareMode;
  testcaseVersion: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Testcase {
  id: string;
  eventId: string;
  problemId: string;
  version: string;
  type: TestcaseType;
  input: string;
  expectedOutput: string;
  showOnFailure: boolean;
  orderIndex: number;
  createdAt: Date;
}

export interface Submission {
  id: string;
  userId: string;
  teamId: string;
  eventId: string;
  problemId: string;
  language: string;
  sourceHash: string;
  testcaseVersion: string;
  status: "AC";
  maxTimeMs: number;
  createdAt: Date;
}

export interface SubmissionCase {
  submissionId: string;
  caseId: string;
  status: "AC";
  timeMs: number;
}

export interface Solve {
  teamId: string;
  eventId: string;
  problemId: string;
  submissionId: string;
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
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  allowedLanguages: string[];
  timeLimitMs: number;
  compareMode: CompareMode;
  testcaseVersion: string;
}

export interface TestcaseResponse {
  id: string;
  type: TestcaseType;
  input: string;
  expectedOutput: string;
  showOnFailure: boolean;
  orderIndex: number;
}

export interface AcSubmissionCaseInput {
  caseId: string;
  status: JudgeStatus;
  timeMs: number;
}

export interface AcSubmissionInput {
  language: string;
  sourceHash: string;
  testcaseVersion: string;
  status: JudgeStatus;
  maxTimeMs: number;
  cases: AcSubmissionCaseInput[];
}

export interface AcSubmissionResponse {
  submissionId: string;
  solved: boolean;
  solvedAt: string;
}
