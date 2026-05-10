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
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  const showAll = session?.role === "admin" || session?.role === "creator";

  const [problems, solves] = await Promise.all([
    getProblems(eventId, showAll),
    getSolveCountByProblem(eventId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 pb-6 border-b border-rp-border flex items-end justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-1">Problems</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-rp-100">問題一覧</h1>
        </div>
        <span className="text-sm text-rp-muted">{problems.length} 問</span>
      </div>

      {problems.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-rp-muted text-sm">問題はまだ公開されていません</p>
        </div>
      ) : (
        <div className="divide-y divide-rp-border">
          {problems.map((p) => (
            <Link
              key={p.id}
              href={`/events/${eventId}/problems/${p.id}`}
              className="flex items-center gap-5 py-5 group hover:bg-rp-800 -mx-4 px-4 transition-colors rounded-lg"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rp-highlight-tint border border-rp-highlight/20 flex items-center justify-center group-hover:bg-rp-highlight group-hover:border-rp-highlight transition-colors">
                <span className="font-mono text-xs font-bold text-rp-highlight group-hover:text-white transition-colors">{p.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-semibold text-rp-100 group-hover:text-rp-400 transition-colors truncate">
                    {p.title}
                  </h2>
                  {!p.isPublished && (
                    <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-rp-border text-rp-muted bg-rp-800">
                      DRAFT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-rp-muted font-mono">
                  <span>{p.timeLimitMs}ms</span>
                  <span className="text-rp-600">·</span>
                  <span>{p.allowedLanguages.join(" / ")}</span>
                  <span className="text-rp-600">·</span>
                  <span>v{p.testcaseVersion}</span>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-rp-success font-mono">
                    {solves.get(p.id) ?? 0}
                  </div>
                  <div className="text-[10px] text-rp-muted uppercase tracking-wide">AC</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-rp-600 group-hover:text-rp-400 transition-colors">
                  <path d="M3.5 7.5h8M8 4l3.5 3.5L8 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
