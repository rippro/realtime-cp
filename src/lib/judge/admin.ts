import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generateCliToken, generateInviteCode, hashPassword, sha256Hex } from "./crypto";
import { badRequest, forbidden, JudgeError, unauthorized } from "./errors";
import { createJudgeAdminRepository } from "./repository";
import type { CompareMode, Event, EventStatus, Problem, TeamRole } from "./types";

export async function withAdmin<T>(
  request: Request,
  handler: (context: { repository: ReturnType<typeof createJudgeAdminRepository> }) => Promise<T>,
): Promise<NextResponse<T | ErrorResponse>> {
  try {
    authenticateAdmin(request.headers.get("authorization"));
    const repository = createJudgeAdminRepository();
    const body = await handler({ repository });
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function createAdminUser(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const id = readId(input, "id");
  const password = readString(input, "password");
  const createdAt = new Date();
  const user = await repository.createUser({
    id,
    passwordHash: await hashPassword(password),
    createdAt,
  });

  return { id: user.id, createdAt: user.createdAt.toISOString() };
}

export async function createAdminEvent(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const status = readOptionalEventStatus(input, "status");
  const isActive = status ? status === "live" : (readOptionalBoolean(input, "isActive") ?? false);
  const event: Event = {
    id: readSlug(input, "id"),
    isActive,
    status: status ?? (isActive ? "live" : "waiting"),
  };
  const created = await repository.createEvent(event);

  return { ...created };
}

export async function createAdminTeam(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const inviteCode = readOptionalString(input, "inviteCode") ?? generateInviteCode();
  const result = await repository.createTeam({
    eventId: readSlug(input, "eventId"),
    name: readString(input, "name"),
    adminUserId: readOptionalId(input, "adminUserId") ?? readId(input, "ownerUserId"),
    inviteCodeHash: sha256Hex(inviteCode),
    inviteCode,
    createdAt: new Date(),
  });

  return {
    team: {
      id: result.team.id,
      eventId: result.team.eventId,
      name: result.team.name,
      createdAt: result.team.createdAt.toISOString(),
    },
    adminMembership: {
      ...result.adminMembership,
      joinedAt: result.adminMembership.joinedAt.toISOString(),
    },
    inviteCode,
  };
}

export async function createAdminTeamMember(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const membership = await repository.createTeamMember({
    teamId: readString(input, "teamId"),
    userId: readId(input, "userId"),
    role: readTeamRole(input, "role"),
    joinedAt: new Date(),
  });

  return {
    ...membership,
    joinedAt: membership.joinedAt.toISOString(),
  };
}

export async function createAdminProblem(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const now = new Date();
  const compareMode = readString(input, "compareMode");
  if (compareMode !== "trimmed-exact") {
    throw badRequest("compareMode must be trimmed-exact");
  }

  const problem: Problem = {
    eventId: readSlug(input, "eventId"),
    id: readProblemId(input, "id"),
    title: readString(input, "title"),
    statement: readString(input, "statement"),
    solutionCode: readOptionalString(input, "solutionCode") ?? "",
    timeLimitMs: readPositiveInteger(input, "timeLimitMs"),
    points: input.points !== undefined ? readPositiveInteger(input, "points") : 100,
    compareMode: compareMode as CompareMode,
    isPublished: readOptionalBoolean(input, "isPublished") ?? false,
    createdAt: now,
    updatedAt: now,
  };
  const created = await repository.createProblem(problem);

  return serializeProblem(created);
}

export async function createAdminCliToken(
  repository: ReturnType<typeof createJudgeAdminRepository>,
  body: unknown,
) {
  const input = readRecord(body);
  const plainToken = generateCliToken();
  const created = await repository.createCliToken({
    userId: readId(input, "userId"),
    teamId: readString(input, "teamId"),
    tokenHash: sha256Hex(plainToken),
    label: readOptionalString(input, "label"),
    expiresAt: readOptionalDate(input, "expiresAt"),
    createdAt: new Date(),
  });

  return {
    token: plainToken,
    cliToken: {
      id: created.id,
      userId: created.userId,
      teamId: created.teamId,
      label: created.label,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

function authenticateAdmin(authorization: string | null): void {
  const configuredToken = process.env.RJ_ADMIN_TOKEN;
  if (!configuredToken) {
    throw forbidden("RJ_ADMIN_TOKEN is not configured");
  }
  if (!authorization) {
    throw unauthorized();
  }

  const [scheme, token, extra] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extra !== undefined) {
    throw unauthorized();
  }

  const expected = Buffer.from(configuredToken);
  const actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw unauthorized();
  }
}

function toErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof JudgeError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof Error && /already exists|ALREADY_EXISTS/i.test(error.message)) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message } },
      { status: 409 },
    );
  }

  if (error instanceof Error && /Missing required foreign key document/.test(error.message)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error.message } },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } },
    { status: 500 },
  );
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

function readRecord(value: unknown, label = "request body"): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw badRequest(`${key} must be a non-empty string`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw badRequest(`${key} must be a string`);
  }
  return value;
}

function readOptionalBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "boolean") {
    throw badRequest(`${key} must be a boolean`);
  }
  return value;
}

function readOptionalEventStatus(record: Record<string, unknown>, key: string): EventStatus | null {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value === "waiting" || value === "live" || value === "ended") {
    return value;
  }
  throw badRequest(`${key} must be waiting, live, or ended`);
}

function readPositiveInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw badRequest(`${key} must be a positive integer`);
  }
  return value;
}

function readOptionalDate(record: Record<string, unknown>, key: string): Date | null {
  const value = readOptionalString(record, key);
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${key} must be an ISO-8601 date`);
  }
  return date;
}

function readId(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(value)) {
    throw badRequest(`${key} must be 2-64 characters of letters, numbers, underscore, or hyphen`);
  }
  return value;
}

function readOptionalId(record: Record<string, unknown>, key: string): string | null {
  const value = readOptionalString(record, key);
  if (!value) {
    return null;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(value)) {
    throw badRequest(`${key} must be 2-64 characters of letters, numbers, underscore, or hyphen`);
  }
  return value;
}

function readTeamRole(record: Record<string, unknown>, key: string): TeamRole {
  const value = readString(record, key);
  if (value !== "admin" && value !== "creator" && value !== "solver") {
    throw badRequest(`${key} must be admin, creator, or solver`);
  }
  return value;
}

function readSlug(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(value)) {
    throw badRequest(`${key} must be a lowercase slug`);
  }
  return value;
}

function readProblemId(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(value)) {
    throw badRequest(`${key} must be 1-32 characters of letters, numbers, underscore, or hyphen`);
  }
  return value;
}

function serializeProblem(problem: Problem) {
  return {
    ...problem,
    createdAt: problem.createdAt.toISOString(),
    updatedAt: problem.updatedAt.toISOString(),
  };
}
