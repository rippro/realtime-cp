import { type JudgeRouteParams, withJudgeAuth } from "@/lib/judge/http";
import { getTestcases } from "@/lib/judge/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<JudgeRouteParams> }) {
  const { eventId, problemId } = await context.params;
  const url = new URL(request.url);

  return withJudgeAuth(request, ({ repository, auth }) =>
    getTestcases(repository, auth, eventId, problemId, url.searchParams.get("version")),
  );
}
