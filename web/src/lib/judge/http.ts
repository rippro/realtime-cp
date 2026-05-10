import { NextResponse } from "next/server";

import { JudgeError } from "./errors";
import { createJudgeRepository } from "./repository";
import { authenticateCliToken } from "./service";

export interface JudgeRouteParams {
  eventId: string;
  problemId: string;
}

export async function withJudgeAuth<T>(
  request: Request,
  handler: (context: {
    repository: ReturnType<typeof createJudgeRepository>;
    auth: Awaited<ReturnType<typeof authenticateCliToken>>;
  }) => Promise<T>,
): Promise<NextResponse<T | ErrorResponse>> {
  try {
    const repository = createJudgeRepository();
    const auth = await authenticateCliToken(repository, request.headers.get("authorization"));
    const body = await handler({ repository, auth });
    return NextResponse.json(body);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function withJudgeAuthCreated<T>(
  request: Request,
  handler: (context: {
    repository: ReturnType<typeof createJudgeRepository>;
    auth: Awaited<ReturnType<typeof authenticateCliToken>>;
  }) => Promise<T>,
): Promise<NextResponse<T | ErrorResponse>> {
  try {
    const repository = createJudgeRepository();
    const auth = await authenticateCliToken(repository, request.headers.get("authorization"));
    const body = await handler({ repository, auth });
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

function toErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof JudgeError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal Server Error",
      },
    },
    { status: 500 },
  );
}
