import type { Timestamp } from "firebase-admin/firestore";
import { notFound } from "next/navigation";
import { ProblemContentTabs } from "@/components/problems/ProblemContentTabs";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";

interface PageProps {
  params: Promise<{ eventId: string; problemId: string }>;
}

async function getProblem(eventId: string, problemId: string, showAll: boolean) {
  try {
    const db = getAdminFirestore();
    const docId = `${eventId}_${problemId}`;
    const [snap, eventSnap] = await Promise.all([
      db.collection("problems").doc(docId).get(),
      db.collection("events").doc(eventId).get(),
    ]);

    if (!snap.exists || !eventSnap.exists) return null;
    const d = snap.data();
    const eventData = eventSnap.data();
    if (!d || !eventData) return null;
    if (!d.isPublished && !showAll) return null;
    const eventStatus =
      eventData.status === "waiting" || eventData.status === "live" || eventData.status === "ended"
        ? eventData.status
        : eventData.isActive
          ? "live"
          : "waiting";

    return {
      id: d.id as string,
      title: d.title as string,
      statement: d.statement as string,
      solutionCode: String(d.solutionCode ?? ""),
      timeLimitMs: d.timeLimitMs as number,
      isPublished: d.isPublished as boolean,
      eventStatus,
      updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
    };
  } catch (error) {
    console.error("Failed to render problem page", error);
    return null;
  }
}

export default async function ProblemPage({ params }: PageProps) {
  const { eventId: _rawEventId, problemId: _rawProblemId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const problemId = decodeURIComponent(_rawProblemId);
  const session = await getSession();
  const showAll = session?.role === "admin" || session?.role === "creator";
  const problem = await getProblem(eventId, problemId, showAll);

  if (!problem) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Problem header */}
      <div className="mb-10 pb-8 border-b border-rp-border">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-sm font-bold text-rp-highlight bg-rp-highlight-tint border border-rp-highlight/25 px-2.5 py-1 rounded-md">
            {problem.id}
          </span>
          {!problem.isPublished && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-rp-border text-rp-muted bg-rp-800">
              DRAFT
            </span>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-rp-100 mb-4">{problem.title}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-rp-muted">
          <span>
            制限時間: <span className="text-rp-300 font-mono">{problem.timeLimitMs}ms</span>
          </span>
        </div>
      </div>

      <section>
        <ProblemContentTabs
          statement={problem.statement}
          solutionCode={problem.solutionCode}
          showSolution={problem.eventStatus === "ended"}
        />
      </section>
    </div>
  );
}
