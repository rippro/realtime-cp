import {
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { newId } from "./crypto";
import type {
  CliToken,
  CompareMode,
  Event,
  Problem,
  Solve,
  Submission,
  SubmissionCase,
  Team,
  TeamMember,
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
  listTestcases(eventId: string, problemId: string): Promise<Testcase[]>;
  createAcceptedSubmission(input: {
    submission: Omit<Submission, "id" | "createdAt">;
    cases: Omit<SubmissionCase, "submissionId">[];
    solvedAt: Date;
  }): Promise<{ submission: Submission; solve: Solve; isFirstSolve: boolean }>;
}

export interface JudgeAdminRepository {
  createUser(input: { id: string; passwordHash: string; createdAt: Date }): Promise<User>;
  createEvent(input: Event): Promise<Event>;
  createTeam(input: {
    id?: string;
    eventId: string;
    name: string;
    inviteCodeHash: string;
    adminUserId: string;
    createdAt: Date;
  }): Promise<{ team: Team; adminMembership: TeamMember }>;
  createTeamMember(input: TeamMember): Promise<TeamMember>;
  createProblem(input: Problem): Promise<Problem>;
  createCliToken(input: {
    userId: string;
    teamId: string;
    tokenHash: string;
    label: string | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): Promise<CliToken>;
}

export class FirestoreJudgeRepository implements JudgeRepository {
  constructor(protected readonly db: Firestore = getAdminFirestore()) {}

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
      .doc(problemDocumentId(eventId, problemId))
      .get();
    return snapshot.exists ? toProblem(snapshot as QueryDocumentSnapshot) : null;
  }

  async listTestcases(eventId: string, problemId: string): Promise<Testcase[]> {
    const snapshot = await this.db
      .collection("testcases")
      .where("eventId", "==", eventId)
      .where("problemId", "==", problemId)
      .get();

    return snapshot.docs.map(toTestcase).sort((a, b) => a.orderIndex - b.orderIndex);
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
    const solveRef = this.db
      .collection("solves")
      .doc(solveDocumentId(submission.teamId, submission.eventId, submission.problemId));
    const submissionRef = this.db.collection("submissions").doc(submission.id);

    return this.db.runTransaction(async (transaction) => {
      const [userSnapshot, teamSnapshot, problemSnapshot, solveSnapshot, testcaseSnapshots] =
        await Promise.all([
          transaction.get(this.db.collection("users").doc(submission.userId)),
          transaction.get(this.db.collection("teams").doc(submission.teamId)),
          transaction.get(
            this.db
              .collection("problems")
              .doc(problemDocumentId(submission.eventId, submission.problemId)),
          ),
          transaction.get(solveRef),
          Promise.all(
            input.cases.map((submissionCase) =>
              transaction.get(this.db.collection("testcases").doc(submissionCase.caseId)),
            ),
          ),
        ]);

      assertExists(userSnapshot.exists, `users/${submission.userId}`);
      assertExists(teamSnapshot.exists, `teams/${submission.teamId}`);
      assertExists(
        problemSnapshot.exists,
        `problems/${problemDocumentId(submission.eventId, submission.problemId)}`,
      );

      for (const [index, testcaseSnapshot] of testcaseSnapshots.entries()) {
        const testcase = testcaseSnapshot.exists
          ? toTestcase(testcaseSnapshot as QueryDocumentSnapshot)
          : null;
        const submissionCase = input.cases[index];
        assertExists(Boolean(testcase), `testcases/${submissionCase?.caseId ?? ""}`);
        if (
          !testcase ||
          testcase.eventId !== submission.eventId ||
          testcase.problemId !== submission.problemId
        ) {
          throw new Error(
            "submissionCases.caseId must reference a testcase for the submission problem",
          );
        }
      }

      const existingSolve = solveSnapshot.exists
        ? toSolve(solveSnapshot as QueryDocumentSnapshot)
        : null;

      transaction.create(submissionRef, {
        ...submission,
        createdAt: Timestamp.fromDate(submission.createdAt),
      });

      for (const submissionCase of input.cases) {
        transaction.create(
          this.db
            .collection("submissionCases")
            .doc(submissionCaseDocumentId(submission.id, submissionCase.caseId)),
          {
            ...submissionCase,
            submissionId: submission.id,
          },
        );
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

export class FirestoreJudgeAdminRepository
  extends FirestoreJudgeRepository
  implements JudgeAdminRepository
{
  async createUser(input: { id: string; passwordHash: string; createdAt: Date }): Promise<User> {
    const user: User = {
      id: input.id,
      passwordHash: input.passwordHash,
      createdAt: input.createdAt,
    };

    await this.db
      .collection("users")
      .doc(user.id)
      .create({
        passwordHash: user.passwordHash,
        createdAt: Timestamp.fromDate(user.createdAt),
      });

    return user;
  }

  async createEvent(input: Event): Promise<Event> {
    await this.db
      .collection("events")
      .doc(input.id)
      .create({
        isActive: input.isActive,
        startsAt: Timestamp.fromDate(input.startsAt),
      });

    return input;
  }

  async createTeam(input: {
    id?: string;
    eventId: string;
    name: string;
    inviteCodeHash: string;
    adminUserId: string;
    createdAt: Date;
  }): Promise<{ team: Team; adminMembership: TeamMember }> {
    const team: Team = {
      id: input.id ?? newId(),
      eventId: input.eventId,
      name: input.name,
      inviteCodeHash: input.inviteCodeHash,
      createdAt: input.createdAt,
    };
    const adminMembership: TeamMember = {
      teamId: team.id,
      userId: input.adminUserId,
      role: "admin",
      joinedAt: input.createdAt,
    };

    await this.db.runTransaction(async (transaction) => {
      const [eventSnapshot, userSnapshot] = await Promise.all([
        transaction.get(this.db.collection("events").doc(team.eventId)),
        transaction.get(this.db.collection("users").doc(adminMembership.userId)),
      ]);

      assertExists(eventSnapshot.exists, `events/${team.eventId}`);
      assertExists(userSnapshot.exists, `users/${adminMembership.userId}`);

      transaction.create(this.db.collection("teams").doc(team.id), {
        eventId: team.eventId,
        name: team.name,
        inviteCodeHash: team.inviteCodeHash,
        createdAt: Timestamp.fromDate(team.createdAt),
      });
      transaction.create(
        this.db
          .collection("teamMembers")
          .doc(teamMemberDocumentId(adminMembership.teamId, adminMembership.userId)),
        {
          ...adminMembership,
          joinedAt: Timestamp.fromDate(adminMembership.joinedAt),
        },
      );
    });

    return { team, adminMembership };
  }

  async createTeamMember(input: TeamMember): Promise<TeamMember> {
    await this.db.runTransaction(async (transaction) => {
      const [teamSnapshot, userSnapshot] = await Promise.all([
        transaction.get(this.db.collection("teams").doc(input.teamId)),
        transaction.get(this.db.collection("users").doc(input.userId)),
      ]);

      assertExists(teamSnapshot.exists, `teams/${input.teamId}`);
      assertExists(userSnapshot.exists, `users/${input.userId}`);

      transaction.create(
        this.db.collection("teamMembers").doc(teamMemberDocumentId(input.teamId, input.userId)),
        {
          ...input,
          joinedAt: Timestamp.fromDate(input.joinedAt),
        },
      );
    });

    return input;
  }

  async createProblem(input: Problem): Promise<Problem> {
    await this.db.runTransaction(async (transaction) => {
      const eventSnapshot = await transaction.get(this.db.collection("events").doc(input.eventId));
      assertExists(eventSnapshot.exists, `events/${input.eventId}`);

      transaction.create(
        this.db.collection("problems").doc(problemDocumentId(input.eventId, input.id)),
        {
          ...input,
          createdAt: Timestamp.fromDate(input.createdAt),
          updatedAt: Timestamp.fromDate(input.updatedAt),
        },
      );
    });

    return input;
  }

  async createCliToken(input: {
    userId: string;
    teamId: string;
    tokenHash: string;
    label: string | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): Promise<CliToken> {
    const token: CliToken = {
      id: newId(),
      userId: input.userId,
      teamId: input.teamId,
      tokenHash: input.tokenHash,
      label: input.label,
      expiresAt: input.expiresAt,
      lastUsedAt: null,
      createdAt: input.createdAt,
      revokedAt: null,
    };

    await this.db.runTransaction(async (transaction) => {
      const [userSnapshot, teamSnapshot, membershipSnapshot] = await Promise.all([
        transaction.get(this.db.collection("users").doc(token.userId)),
        transaction.get(this.db.collection("teams").doc(token.teamId)),
        transaction.get(
          this.db.collection("teamMembers").doc(teamMemberDocumentId(token.teamId, token.userId)),
        ),
      ]);

      assertExists(userSnapshot.exists, `users/${token.userId}`);
      assertExists(teamSnapshot.exists, `teams/${token.teamId}`);
      assertExists(membershipSnapshot.exists, `teamMembers/${token.teamId}/${token.userId}`);
      const membership = toTeamMember(membershipSnapshot as QueryDocumentSnapshot);
      if (membership.role !== "solver") {
        throw new Error("cliTokens.userId must reference a solver team member");
      }

      transaction.create(this.db.collection("_unique").doc(cliTokenHashUniqueId(token.tokenHash)), {
        tokenId: token.id,
      });
      transaction.create(this.db.collection("cliTokens").doc(token.id), {
        userId: token.userId,
        teamId: token.teamId,
        tokenHash: token.tokenHash,
        label: token.label,
        expiresAt: token.expiresAt ? Timestamp.fromDate(token.expiresAt) : null,
        lastUsedAt: null,
        createdAt: Timestamp.fromDate(token.createdAt),
        revokedAt: null,
      });
    });

    return token;
  }
}

export function createJudgeRepository(): JudgeRepository {
  return new FirestoreJudgeRepository();
}

export function createJudgeAdminRepository(): JudgeAdminRepository {
  return new FirestoreJudgeAdminRepository();
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

function toTeamMember(doc: QueryDocumentSnapshot): TeamMember {
  const data = doc.data();
  const role = readString(data, "role");
  if (role !== "admin" && role !== "creator" && role !== "solver") {
    throw new Error(`Unsupported team member role: ${role}`);
  }

  return {
    teamId: readString(data, "teamId"),
    userId: readString(data, "userId"),
    role,
    joinedAt: readDate(data, "joinedAt"),
  };
}

function toEvent(doc: QueryDocumentSnapshot): Event {
  const data = doc.data();
  return {
    id: doc.id,
    isActive: readBoolean(data, "isActive"),
    startsAt: readDate(data, "startsAt"),
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
    solutionCode: readNullableString(data, "solutionCode") ?? "",
    timeLimitMs: readNumber(data, "timeLimitMs"),
    compareMode: compareMode as CompareMode,
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

function assertExists(exists: boolean, path: string): void {
  if (!exists) {
    throw new Error(`Missing required foreign key document: ${path}`);
  }
}

function problemDocumentId(eventId: string, problemId: string): string {
  return encodeCompositeId([eventId, problemId]);
}

function teamMemberDocumentId(teamId: string, userId: string): string {
  return encodeCompositeId([teamId, userId]);
}

function solveDocumentId(teamId: string, eventId: string, problemId: string): string {
  return encodeCompositeId([teamId, eventId, problemId]);
}

function submissionCaseDocumentId(submissionId: string, caseId: string): string {
  return encodeCompositeId([submissionId, caseId]);
}

function cliTokenHashUniqueId(tokenHash: string): string {
  return `cliTokens:tokenHash:${tokenHash}`;
}

function encodeCompositeId(parts: string[]): string {
  return parts.map((part) => part.replaceAll("_", "__")).join("_");
}
