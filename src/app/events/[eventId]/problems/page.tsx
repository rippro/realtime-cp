import Link from "next/link";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

async function getProblems(eventId: string, showAll: boolean) {
  try {
    const db = getAdminFirestore();
    let query = db.collection("problems").where("eventId", "==", eventId);
    if (!showAll) query = query.where("isPublished", "==", true) as typeof query;
    const snap = await query.orderBy("id", "asc").get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: d.id as string,
        title: d.title as string,
        isPublished: d.isPublished as boolean,
        allowedLanguages: d.allowedLanguages as string[],
        timeLimitMs: d.timeLimitMs as number,
        testcaseVersion: d.testcaseVersion as string,
        updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

async function getSolveCountByProblem(eventId: string) {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("solves").where("eventId", "==", eventId).get();
    const map = new Map<string, number>();
    for (const doc of snap.docs) {
      const pid = doc.data().problemId as string;
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return map;
  } catch {
    return new Map<string, number>();
  }
}

export default async function ProblemsPage({ params }: PageProps) {
  const { eventId } = await params;
  const session = await getSession();
  const showAll = session?.role === "admin" || session?.role === "creator";

  const [problems, solves] = await Promise.all([
    getProblems(eventId, showAll),
    getSolveCountByProblem(eventId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-rp-100">Problems</h1>
          <p className="text-sm text-rp-muted mt-0.5">{problems.length} 問</p>
        </div>
      </div>

      {problems.length === 0 ? (
        <div className="card-surface p-16 text-center">
          <p className="text-rp-muted">問題はまだ公開されていません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {problems.map((p) => (
            <Link
              key={p.id}
              href={`/events/${eventId}/problems/${p.id}`}
              className="card-surface flex items-center gap-4 p-4 hover:border-rp-500 transition-all group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-rp-700 flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-rp-300">{p.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-display text-base font-semibold text-rp-100 group-hover:text-rp-300 transition-colors truncate">
                    {p.title}
                  </h2>
                  {!p.isPublished && (
                    <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-rp-muted/30 text-rp-muted">
                      DRAFT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-rp-muted font-mono">
                  <span>{p.timeLimitMs}ms</span>
                  <span>{p.allowedLanguages.join(" / ")}</span>
                  <span className="text-rp-500">ver {p.testcaseVersion}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-mono text-lg font-bold text-rp-success">
                  {solves.get(p.id) ?? 0}
                </div>
                <div className="text-[10px] text-rp-muted">AC</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
