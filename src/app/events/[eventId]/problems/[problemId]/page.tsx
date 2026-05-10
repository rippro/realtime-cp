import { notFound } from "next/navigation";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth/session";
import { Timestamp } from "firebase-admin/firestore";

interface PageProps {
  params: Promise<{ eventId: string; problemId: string }>;
}

async function getProblemWithTestcases(eventId: string, problemId: string, showAll: boolean) {
  try {
    const db = getAdminFirestore();
    const docId = `${eventId}_${problemId}`;
    const [problemSnap, testcasesSnap] = await Promise.all([
      db.collection("problems").doc(docId).get(),
      db.collection("testcases")
        .where("eventId", "==", eventId)
        .where("problemId", "==", problemId)
        .where("type", "==", "sample")
        .orderBy("orderIndex", "asc")
        .get(),
    ]);

    if (!problemSnap.exists) return null;
    const d = problemSnap.data()!;
    if (!d.isPublished && !showAll) return null;

    return {
      id: d.id as string,
      title: d.title as string,
      statement: d.statement as string,
      constraints: d.constraints as string,
      inputFormat: d.inputFormat as string,
      outputFormat: d.outputFormat as string,
      allowedLanguages: d.allowedLanguages as string[],
      timeLimitMs: d.timeLimitMs as number,
      testcaseVersion: d.testcaseVersion as string,
      isPublished: d.isPublished as boolean,
      updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
      samples: testcasesSnap.docs.map((t) => ({
        id: t.id,
        input: t.data().input as string,
        expectedOutput: t.data().expectedOutput as string,
        orderIndex: t.data().orderIndex as number,
      })),
    };
  } catch {
    return null;
  }
}

export default async function ProblemPage({ params }: PageProps) {
  const { eventId, problemId } = await params;
  const session = await getSession();
  const showAll = session?.role === "admin" || session?.role === "creator";
  const problem = await getProblemWithTestcases(eventId, problemId, showAll);

  if (!problem) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-sm text-rp-muted">{problem.id}</span>
          {!problem.isPublished && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-rp-muted/30 text-rp-muted">
              DRAFT
            </span>
          )}
          <span className="font-mono text-xs text-rp-500">ver {problem.testcaseVersion}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-rp-100 mb-2">{problem.title}</h1>
        <div className="flex items-center gap-4 text-xs font-mono text-rp-muted">
          <span>制限時間: <span className="text-rp-100">{problem.timeLimitMs}ms</span></span>
          <span>言語: <span className="text-rp-100">{problem.allowedLanguages.join(", ")}</span></span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 問題文 */}
        <section className="card-surface p-6">
          <h2 className="font-display text-base font-bold text-rp-300 mb-3">問題文</h2>
          <div className="text-sm text-rp-100 leading-7 whitespace-pre-wrap">{problem.statement}</div>
        </section>

        {/* 制約 */}
        {problem.constraints && (
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-bold text-rp-300 mb-3">制約</h2>
            <div className="text-sm text-rp-100 leading-7 whitespace-pre-wrap font-mono">{problem.constraints}</div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* 入力形式 */}
          {problem.inputFormat && (
            <section className="card-surface p-5">
              <h2 className="font-display text-sm font-bold text-rp-300 mb-2">入力</h2>
              <pre className="text-xs text-rp-100 font-mono whitespace-pre-wrap leading-5">{problem.inputFormat}</pre>
            </section>
          )}
          {/* 出力形式 */}
          {problem.outputFormat && (
            <section className="card-surface p-5">
              <h2 className="font-display text-sm font-bold text-rp-300 mb-2">出力</h2>
              <pre className="text-xs text-rp-100 font-mono whitespace-pre-wrap leading-5">{problem.outputFormat}</pre>
            </section>
          )}
        </div>

        {/* サンプル */}
        {problem.samples.length > 0 && (
          <section>
            <h2 className="font-display text-base font-bold text-rp-300 mb-3">サンプル</h2>
            <div className="space-y-3">
              {problem.samples.map((s, i) => (
                <div key={s.id} className="card-surface p-5">
                  <p className="text-xs font-mono text-rp-muted mb-3">サンプル {i + 1}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-mono text-rp-500 mb-1.5">入力</p>
                      <pre className="rounded-lg bg-rp-900 border border-rp-border p-3 text-xs font-mono text-rp-300 whitespace-pre-wrap">{s.input}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-rp-500 mb-1.5">出力</p>
                      <pre className="rounded-lg bg-rp-900 border border-rp-border p-3 text-xs font-mono text-rp-success whitespace-pre-wrap">{s.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
