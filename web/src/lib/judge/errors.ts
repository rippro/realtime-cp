export type JudgeErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class JudgeError extends Error {
  readonly code: JudgeErrorCode;
  readonly status: number;

  constructor(code: JudgeErrorCode, message: string, status: number) {
    super(message);
    this.name = "JudgeError";
    this.code = code;
    this.status = status;
  }
}

export function badRequest(message: string): JudgeError {
  return new JudgeError("BAD_REQUEST", message, 400);
}

export function unauthorized(message = "Unauthorized"): JudgeError {
  return new JudgeError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden"): JudgeError {
  return new JudgeError("FORBIDDEN", message, 403);
}

export function notFound(message = "Not Found"): JudgeError {
  return new JudgeError("NOT_FOUND", message, 404);
}

export function conflict(message: string): JudgeError {
  return new JudgeError("CONFLICT", message, 409);
}
