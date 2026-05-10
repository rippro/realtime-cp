import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import { newId, sha256Hex } from "./crypto";
import type {
  CliToken,
  CompareMode,
  Event,
  Problem,
  Solve,
  Submission,
  SubmissionCase,
  Team,
  Testcase,
  TestcaseType,
  User,
} from "./types";

export interface JudgeRepository {
  findCliTokenByHash(tokenHash: string): Promise<CliToken | null>;
  touchCliToken(id: string, usedAt: Date): Promise<void>;
  findTeam(id: string): Promise<Team | null>;
  findEvent(id: string): Promise<Event | null>;
  findProblem(eventId: string, problemId: string): Promise<Problem | null>;
  listTestcases(eventId: string, problemId: string, version: string): Promise<Testcase[]>;
  createAcceptedSubmission(input: {
    submission: Omit<Submission, "id" | "createdAt">;
    cases: Omit<SubmissionCase, "submissionId">[];
    solvedAt: Date;
  }): Promise<{ submission: Submission; solve: Solve; isFirstSolve: boolean }>;
}

interface MemoryStore {
  users: User[];
  teams: Team[];
  cliTokens: CliToken[];
  events: Event[];
  problems: Problem[];
  testcases: Testcase[];
  submissions: Submission[];
  submissionCases: SubmissionCase[];
  solves: Solve[];
}

export const devCliToken = process.env.RJ_DEV_TOKEN ?? "rj_live_0123456789abcdefghijklmnopqrstuv";

function createSeedStore(now = new Date()): MemoryStore {
  const eventId = "rippro-2026-spring";
  const teamId = "01JUDGEDEVTEAM000000000000";

  return {
    users: [
      {
        id: "demo",
        passwordHash: sha256Hex("demo-password"),
        createdAt: now,
      },
    ],
    teams: [
      {
        id: teamId,
        eventId,
        name: "Demo Team",
        inviteCodeHash: sha256Hex("demo-invite"),
        createdAt: now,
      },
    ],
    cliTokens: [
      {
        id: "01JUDGEDEVTOKEN0000000000",
        userId: "demo",
        teamId,
        tokenHash: sha256Hex(devCliToken),
        label: "development seed token",
        expiresAt: null,
        lastUsedAt: null,
        createdAt: now,
        revokedAt: null,
      },
    ],
    events: [
      {
        id: eventId,
        isActive: true,
        startsAt: new Date("2026-04-01T00:00:00.000Z"),
        endsAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ],
    problems: [
      {
        eventId,
        id: "001",
        title: "A + B",
        statement: "整数 A と B が与えられるので、その和を出力してください。",
        constraints: "0 <= A, B <= 100",
        inputFormat: "A B",
        outputFormat: "A + B を1行に出力してください。",
        allowedLanguages: ["cpp", "python"],
        timeLimitMs: 2000,
        compareMode: "trimmed-exact",
        testcaseVersion: "v1",
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    testcases: [
      {
        id: "01JUDGEDEVCASE00000000001",
        eventId,
        problemId: "001",
        version: "v1",
        type: "sample",
        input: "1 2\n",
        expectedOutput: "3\n",
        showOnFailure: true,
        orderIndex: 1,
        createdAt: now,
      },
      {
        id: "01JUDGEDEVCASE00000000002",
        eventId,
        problemId: "001",
        version: "v1",
        type: "hidden",
        input: "40 2\n",
        expectedOutput: "42\n",
        showOnFailure: false,
        orderIndex: 2,
        createdAt: now,
      },
    ],
    submissions: [],
    submissionCases: [],
    solves: [],
  };
}

const globalForStore = globalThis as typeof globalThis & {
  __ripproJudgeStore?: MemoryStore;
};

export class MemoryJudgeRepository implements JudgeRepository {
  private readonly store: MemoryStore;

  constructor(store = getMemoryStore()) {
    this.store = store;
  }

  async findCliTokenByHash(tokenHash: string): Promise<CliToken | null> {
    return this.store.cliTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async touchCliToken(id: string, usedAt: Date): Promise<void> {
    const token = this.store.cliTokens.find((candidate) => candidate.id === id);
    if (token) {
      token.lastUsedAt = usedAt;
    }
  }

  async findTeam(id: string): Promise<Team | null> {
    return this.store.teams.find((team) => team.id === id) ?? null;
  }

  async findEvent(id: string): Promise<Event | null> {
    return this.store.events.find((event) => event.id === id) ?? null;
  }

  async findProblem(eventId: string, problemId: string): Promise<Problem | null> {
    return (
      this.store.problems.find(
        (problem) => problem.eventId === eventId && problem.id === problemId,
      ) ?? null
    );
  }

  async listTestcases(eventId: string, problemId: string, version: string): Promise<Testcase[]> {
    return this.store.testcases
      .filter(
        (testcase) =>
          testcase.eventId === eventId &&
          testcase.problemId === problemId &&
          testcase.version === version,
      )
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }

  async createAcceptedSubmission(input: {
    submission: Omit<Submission, "id" | "createdAt">;
    cases: Omit<SubmissionCase, "submissionId">[];
    solvedAt: Date;
  }): Promise<{ submission: Submission; solve: Solve; isFirstSolve: boolean }> {
    const submission: Submission = {
      ...input.submission,
      id: newId(),
      createdAt: input.solvedAt,
    };

    this.store.submissions.push(submission);
    for (const submissionCase of input.cases) {
      this.store.submissionCases.push({
        ...submissionCase,
        submissionId: submission.id,
      });
    }

    const existingSolve = this.store.solves.find(
      (solve) =>
        solve.teamId === submission.teamId &&
        solve.eventId === submission.eventId &&
        solve.problemId === submission.problemId,
    );

    if (existingSolve) {
      return { submission, solve: existingSolve, isFirstSolve: false };
    }

    const solve: Solve = {
      teamId: submission.teamId,
      eventId: submission.eventId,
      problemId: submission.problemId,
      submissionId: submission.id,
      solvedAt: input.solvedAt,
    };
    this.store.solves.push(solve);

    return { submission, solve, isFirstSolve: true };
  }
}

export class FirestoreJudgeRepository implements JudgeRepository {
  constructor(private readonly db: Firestore = getAdminFirestore()) {}

  async findCliTokenByHash(tokenHash: string): Promise<CliToken | null> {
    const snapshot = await this.db
      .collection("cliTokens")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();
    const tokenDoc = snapshot.docs[0];
    return tokenDoc ? toCliToken(tokenDoc) : null;
  }

  async touchCliToken(id: string, usedAt: Date): Promise<void> {
    await this.db
      .collection("cliTokens")
      .doc(id)
      .update({
        lastUsedAt: Timestamp.fromDate(usedAt),
      });
  }

  async findTeam(id: string): Promise<Team | null> {
    const snapshot = await this.db.collection("teams").doc(id).get();
    return snapshot.exists ? toTeam(snapshot as QueryDocumentSnapshot) : null;
  }

  async findEvent(id: string): Promise<Event | null> {
    const snapshot = await this.db.collection("events").doc(id).get();
    return snapshot.exists ? toEvent(snapshot as QueryDocumentSnapshot) : null;
  }

  async findProblem(eventId: string, problemId: string): Promise<Problem | null> {
    const snapshot = await this.db
      .collection("problems")
      .where("eventId", "==", eventId)
      .where("id", "==", problemId)
      .limit(1)
      .get();
    const problemDoc = snapshot.docs[0];
    return problemDoc ? toProblem(problemDoc) : null;
  }

  async listTestcases(eventId: string, problemId: string, version: string): Promise<Testcase[]> {
    const snapshot = await this.db
      .collection("testcases")
      .where("eventId", "==", eventId)
      .where("problemId", "==", problemId)
      .where("version", "==", version)
      .orderBy("orderIndex", "asc")
      .get();

    return snapshot.docs.map(toTestcase);
  }

  async createAcceptedSubmission(input: {
    submission: Omit<Submission, "id" | "createdAt">;
    cases: Omit<SubmissionCase, "submissionId">[];
    solvedAt: Date;
  }): Promise<{ submission: Submission; solve: Solve; isFirstSolve: boolean }> {
    const submission: Submission = {
      ...input.submission,
      id: newId(),
      createdAt: input.solvedAt,
    };
    const solveId = solveDocumentId(submission.teamId, submission.eventId, submission.problemId);
    const solveRef = this.db.collection("solves").doc(solveId);
    const submissionRef = this.db.collection("submissions").doc(submission.id);

    return this.db.runTransaction(async (transaction) => {
      const solveSnapshot = await transaction.get(solveRef);
      const existingSolve = solveSnapshot.exists
        ? toSolve(solveSnapshot as QueryDocumentSnapshot)
        : null;

      transaction.create(submissionRef, {
        ...submission,
        createdAt: Timestamp.fromDate(submission.createdAt),
      });

      for (const submissionCase of input.cases) {
        const caseRef = this.db
          .collection("submissionCases")
          .doc(submissionCaseDocumentId(submission.id, submissionCase.caseId));
        transaction.create(caseRef, {
          ...submissionCase,
          submissionId: submission.id,
        });
      }

      if (existingSolve) {
        return { submission, solve: existingSolve, isFirstSolve: false };
      }

      const solve: Solve = {
        teamId: submission.teamId,
        eventId: submission.eventId,
        problemId: submission.problemId,
        submissionId: submission.id,
        solvedAt: input.solvedAt,
      };
      transaction.create(solveRef, {
        ...solve,
        solvedAt: Timestamp.fromDate(solve.solvedAt),
      });

      return { submission, solve, isFirstSolve: true };
    });
  }
}

function getMemoryStore(): MemoryStore {
  if (!globalForStore.__ripproJudgeStore) {
    globalForStore.__ripproJudgeStore = createSeedStore();
  }

  return globalForStore.__ripproJudgeStore;
}

export function createJudgeRepository(): JudgeRepository {
  return new FirestoreJudgeRepository();
}

function toCliToken(doc: QueryDocumentSnapshot): CliToken {
  const data = doc.data();
  return {
    id: doc.id,
    userId: readString(data, "userId"),
    teamId: readString(data, "teamId"),
    tokenHash: readString(data, "tokenHash"),
    label: readNullableString(data, "label"),
    expiresAt: readNullableDate(data, "expiresAt"),
    lastUsedAt: readNullableDate(data, "lastUsedAt"),
    createdAt: readDate(data, "createdAt"),
    revokedAt: readNullableDate(data, "revokedAt"),
  };
}

function toTeam(doc: QueryDocumentSnapshot): Team {
  const data = doc.data();
  return {
    id: doc.id,
    eventId: readString(data, "eventId"),
    name: readString(data, "name"),
    inviteCodeHash: readString(data, "inviteCodeHash"),
    createdAt: readDate(data, "createdAt"),
  };
}

function toEvent(doc: QueryDocumentSnapshot): Event {
  const data = doc.data();
  return {
    id: doc.id,
    isActive: readBoolean(data, "isActive"),
    startsAt: readDate(data, "startsAt"),
    endsAt: readDate(data, "endsAt"),
  };
}

function toProblem(doc: QueryDocumentSnapshot): Problem {
  const data = doc.data();
  const compareMode = readString(data, "compareMode");
  if (compareMode !== "trimmed-exact") {
    throw new Error(`Unsupported compareMode: ${compareMode}`);
  }

  return {
    eventId: readString(data, "eventId"),
    id: readString(data, "id"),
    title: readString(data, "title"),
    statement: readString(data, "statement"),
    constraints: readString(data, "constraints"),
    inputFormat: readString(data, "inputFormat"),
    outputFormat: readString(data, "outputFormat"),
    allowedLanguages: readStringArray(data, "allowedLanguages"),
    timeLimitMs: readNumber(data, "timeLimitMs"),
    compareMode: compareMode as CompareMode,
    testcaseVersion: readString(data, "testcaseVersion"),
    isPublished: readBoolean(data, "isPublished"),
    createdAt: readDate(data, "createdAt"),
    updatedAt: readDate(data, "updatedAt"),
  };
}

function toTestcase(doc: QueryDocumentSnapshot): Testcase {
  const data = doc.data();
  const type = readString(data, "type");
  if (type !== "sample" && type !== "hidden") {
    throw new Error(`Unsupported testcase type: ${type}`);
  }

  return {
    id: doc.id,
    eventId: readString(data, "eventId"),
    problemId: readString(data, "problemId"),
    version: readString(data, "version"),
    type: type as TestcaseType,
    input: readString(data, "input"),
    expectedOutput: readString(data, "expectedOutput"),
    showOnFailure: readBoolean(data, "showOnFailure"),
    orderIndex: readNumber(data, "orderIndex"),
    createdAt: readDate(data, "createdAt"),
  };
}

function toSolve(doc: QueryDocumentSnapshot): Solve {
  const data = doc.data();
  return {
    teamId: readString(data, "teamId"),
    eventId: readString(data, "eventId"),
    problemId: readString(data, "problemId"),
    submissionId: readString(data, "submissionId"),
    solvedAt: readDate(data, "solvedAt"),
  };
}

function readString(data: DocumentData, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Firestore field ${key} must be a non-empty string`);
  }
  return value;
}

function readNullableString(data: DocumentData, key: string): string | null {
  const value = data[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Firestore field ${key} must be a string or null`);
  }
  return value;
}

function readStringArray(data: DocumentData, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Firestore field ${key} must be a string array`);
  }
  return value;
}

function readNumber(data: DocumentData, key: string): number {
  const value = data[key];
  if (typeof value !== "number") {
    throw new Error(`Firestore field ${key} must be a number`);
  }
  return value;
}

function readBoolean(data: DocumentData, key: string): boolean {
  const value = data[key];
  if (typeof value !== "boolean") {
    throw new Error(`Firestore field ${key} must be a boolean`);
  }
  return value;
}

function readDate(data: DocumentData, key: string): Date {
  const value = data[key];
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  throw new Error(`Firestore field ${key} must be a timestamp`);
}

function readNullableDate(data: DocumentData, key: string): Date | null {
  const value = data[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  throw new Error(`Firestore field ${key} must be a timestamp or null`);
}

function solveDocumentId(teamId: string, eventId: string, problemId: string): string {
  return encodeCompositeId([teamId, eventId, problemId]);
}

function submissionCaseDocumentId(submissionId: string, caseId: string): string {
  return encodeCompositeId([submissionId, caseId]);
}

function encodeCompositeId(parts: string[]): string {
  return parts.map((part) => part.replaceAll("_", "__")).join("_");
}
