import { sha256Hex } from "./crypto";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "./errors";
import type { JudgeRepository } from "./repository";
import type {
  AcSubmissionInput,
  AcSubmissionResponse,
  AuthenticatedCliToken,
  JudgeStatus,
  Problem,
  ProblemConfigResponse,
  Testcase,
  TestcaseResponse,
} from "./types";

export async function authenticateCliToken(
  repository: JudgeRepository,
  authorization: string | null,
  now = new Date(),
): Promise<AuthenticatedCliToken> {
  const token = readBearerToken(authorization);
  const cliToken = await repository.findCliTokenByHash(sha256Hex(token));

  if (!cliToken) {
    throw unauthorized();
  }
  if (cliToken.revokedAt !== null) {
    throw unauthorized();
  }
  if (cliToken.expiresAt !== null && cliToken.expiresAt <= now) {
    throw unauthorized();
  }

  const team = await repository.findTeam(cliToken.teamId);
  if (!team) {
    throw unauthorized();
  }

  await repository.touchCliToken(cliToken.id, now);
  return { token: cliToken, team };
}

export async function getProblemConfig(
  repository: JudgeRepository,
  auth: AuthenticatedCliToken,
  eventId: string,
  problemId: string,
): Promise<ProblemConfigResponse> {
  const { problem } = await getPublishedActiveProblem(repository, auth, eventId, problemId);
  return toProblemConfig(problem);
}

export async function getTestcases(
  repository: JudgeRepository,
  auth: AuthenticatedCliToken,
  eventId: string,
  problemId: string,
  version: string | null,
): Promise<{ version: string; cases: TestcaseResponse[] }> {
  if (!version) {
    throw badRequest("version is required");
  }

  const { problem } = await getPublishedActiveProblem(repository, auth, eventId, problemId);
  if (version !== problem.testcaseVersion) {
    throw conflict("version must match the current testcaseVersion");
  }

  const testcases = await repository.listTestcases(eventId, problemId, version);
  return {
    version,
    cases: testcases.map(toTestcaseResponse),
  };
}

export async function createAcceptedSubmission(
  repository: JudgeRepository,
  auth: AuthenticatedCliToken,
  eventId: string,
  problemId: string,
  body: unknown,
  now = new Date(),
): Promise<AcSubmissionResponse> {
  const input = parseAcSubmissionInput(body);
  const { problem } = await getPublishedActiveProblem(repository, auth, eventId, problemId);

  if (!problem.allowedLanguages.includes(input.language)) {
    throw badRequest("language is not allowed for this problem");
  }
  if (input.testcaseVersion !== problem.testcaseVersion) {
    throw conflict("testcaseVersion must match the current testcaseVersion");
  }
  if (input.status !== "AC") {
    throw badRequest('status must be "AC"');
  }
  if (input.cases.some((submissionCase) => submissionCase.status !== "AC")) {
    throw badRequest('all case statuses must be "AC"');
  }

  const testcases = await repository.listTestcases(eventId, problemId, problem.testcaseVersion);
  assertSubmissionCasesMatchTestcases(input, testcases);

  const result = await repository.createAcceptedSubmission({
    submission: {
      userId: auth.token.userId,
      teamId: auth.token.teamId,
      eventId,
      problemId,
      language: input.language,
      sourceHash: input.sourceHash,
      testcaseVersion: input.testcaseVersion,
      status: "AC",
      maxTimeMs: input.maxTimeMs,
    },
    cases: input.cases.map((submissionCase) => ({
      caseId: submissionCase.caseId,
      status: "AC",
      timeMs: submissionCase.timeMs,
    })),
    solvedAt: now,
  });

  return {
    submissionId: result.submission.id,
    solved: result.isFirstSolve,
    solvedAt: result.solve.solvedAt.toISOString(),
  };
}

function readBearerToken(authorization: string | null): string {
  if (!authorization) {
    throw unauthorized();
  }

  const [scheme, token, extra] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extra !== undefined) {
    throw unauthorized();
  }

  return token;
}

async function getPublishedActiveProblem(
  repository: JudgeRepository,
  auth: AuthenticatedCliToken,
  eventId: string,
  problemId: string,
): Promise<{ problem: Problem }> {
  if (auth.team.eventId !== eventId) {
    throw forbidden();
  }

  const event = await repository.findEvent(eventId);
  if (!event) {
    throw notFound("event not found");
  }
  if (!event.isActive) {
    throw forbidden("event is not active");
  }

  const problem = await repository.findProblem(eventId, problemId);
  if (!problem) {
    throw notFound("problem not found");
  }
  if (!problem.isPublished) {
    throw notFound("problem not found");
  }

  return { problem };
}

function toProblemConfig(problem: Problem): ProblemConfigResponse {
  return {
    eventId: problem.eventId,
    id: problem.id,
    title: problem.title,
    statement: problem.statement,
    constraints: problem.constraints,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    allowedLanguages: problem.allowedLanguages,
    timeLimitMs: problem.timeLimitMs,
    compareMode: problem.compareMode,
    testcaseVersion: problem.testcaseVersion,
  };
}

function toTestcaseResponse(testcase: Testcase): TestcaseResponse {
  return {
    id: testcase.id,
    type: testcase.type,
    input: testcase.input,
    expectedOutput: testcase.expectedOutput,
    showOnFailure: testcase.showOnFailure,
    orderIndex: testcase.orderIndex,
  };
}

function parseAcSubmissionInput(body: unknown): AcSubmissionInput {
  if (!isRecord(body)) {
    throw badRequest("request body must be an object");
  }

  const language = readString(body, "language");
  const sourceHash = readString(body, "sourceHash");
  const testcaseVersion = readString(body, "testcaseVersion");
  const status = readJudgeStatus(body, "status");
  const maxTimeMs = readNonNegativeInteger(body, "maxTimeMs");
  const casesValue = body.cases;

  if (!Array.isArray(casesValue)) {
    throw badRequest("cases must be an array");
  }

  const cases = casesValue.map((value, index) => {
    if (!isRecord(value)) {
      throw badRequest(`cases[${index}] must be an object`);
    }

    return {
      caseId: readString(value, "caseId"),
      status: readJudgeStatus(value, "status"),
      timeMs: readNonNegativeInteger(value, "timeMs"),
    };
  });

  if (!/^[a-f0-9]{64}$/.test(sourceHash)) {
    throw badRequest("sourceHash must be a SHA-256 hex digest");
  }

  return {
    language,
    sourceHash,
    testcaseVersion,
    status,
    maxTimeMs,
    cases,
  };
}

function assertSubmissionCasesMatchTestcases(
  input: AcSubmissionInput,
  testcases: Testcase[],
): void {
  const expectedIds = new Set(testcases.map((testcase) => testcase.id));
  const actualIds = new Set<string>();

  for (const submissionCase of input.cases) {
    if (actualIds.has(submissionCase.caseId)) {
      throw badRequest("cases must not contain duplicate caseId values");
    }
    actualIds.add(submissionCase.caseId);
  }

  if (actualIds.size !== expectedIds.size) {
    throw badRequest("cases must correspond to all testcases in the current version");
  }

  for (const caseId of actualIds) {
    if (!expectedIds.has(caseId)) {
      throw badRequest("cases contain a testcase outside the target problem/version");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw badRequest(`${key} must be a non-empty string`);
  }
  return value;
}

function readJudgeStatus(record: Record<string, unknown>, key: string): JudgeStatus {
  const value = readString(record, key);
  if (!["AC", "WA", "TLE", "RE", "CE", "IE"].includes(value)) {
    throw badRequest(`${key} must be a valid judge status`);
  }
  return value as JudgeStatus;
}

function readNonNegativeInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw badRequest(`${key} must be a non-negative integer`);
  }
  return value;
}
