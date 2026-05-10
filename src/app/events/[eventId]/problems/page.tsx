import type { Timestamp } from "firebase-admin/firestore";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAdminFirestore } from "@/lib/firebase/admin";

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
        timeLimitMs: d.timeLimitMs as number,
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
          <p className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-1">
            Problems
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-rp-100">問題一覧</h1>
        </div>
        <span className="text-sm text-rp-muted">{problems.length} 問</span>
      </div>

      {problems.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-rp-muted text-sm">問題はまだ公開されていません</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[48px_1fr_100px_80px] gap-4 px-4 pb-2 text-[11px] font-medium text-rp-muted uppercase tracking-wider">
            <span>#</span>
            <span>問題名</span>
            <span>条件</span>
            <span className="text-right">AC</span>
          </div>
          <div className="divide-y divide-rp-border border-t border-rp-border">
            {problems.map((p) => (
              <Link
                key={p.id}
                href={`/events/${eventId}/problems/${p.id}`}
                className="flex items-center gap-4 py-4 -mx-4 px-4 group hover:bg-rp-800 transition-colors"
              >
                {/* ID */}
                <div className="flex-shrink-0 w-10 text-center font-mono text-sm font-bold text-rp-highlight">
                  {p.id}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h2 className="text-sm font-medium text-rp-100 truncate group-hover:text-rp-400 transition-colors">
                    {p.title}
                  </h2>
                  {!p.isPublished && (
                    <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rp-800 border border-rp-border text-rp-muted">
                      DRAFT
                    </span>
                  )}
                </div>
                {/* Time limit */}
                <div className="hidden sm:block w-24 text-xs font-mono text-rp-muted flex-shrink-0">
                  {p.timeLimitMs}ms
                </div>
                {/* AC count + arrow */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-10 text-right text-base font-bold text-rp-success font-mono tabular-nums">
                    {solves.get(p.id) ?? 0}
                  </span>
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="text-rp-600 group-hover:text-rp-400 transition-colors"
                  >
                    <path
                      d="M3 7h8M7 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
