import { newId, sha256Hex } from "./crypto";
import type {
  CliToken,
  Event,
  Problem,
  Solve,
  Submission,
  SubmissionCase,
  Team,
  Testcase,
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

function getMemoryStore(): MemoryStore {
  if (!globalForStore.__ripproJudgeStore) {
    globalForStore.__ripproJudgeStore = createSeedStore();
  }

  return globalForStore.__ripproJudgeStore;
}

export function createJudgeRepository(): JudgeRepository {
  return new MemoryJudgeRepository();
}
