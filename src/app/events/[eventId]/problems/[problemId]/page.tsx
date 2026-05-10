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
  const { eventId: _rawEventId, problemId: _rawProblemId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const problemId = decodeURIComponent(_rawProblemId);
  const session = await getSession();
  const showAll = session?.role === "admin" || session?.role === "creator";
  const problem = await getProblemWithTestcases(eventId, problemId, showAll);

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
          <span className="font-mono text-xs text-rp-muted">v{problem.testcaseVersion}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-rp-100 mb-4">{problem.title}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-rp-muted">
          <span>制限時間: <span className="text-rp-300 font-mono">{problem.timeLimitMs}ms</span></span>
          <span>言語: <span className="text-rp-300 font-mono">{problem.allowedLanguages.join(", ")}</span></span>
        </div>
      </div>

      <div className="space-y-8">
        {/* 問題文 */}
        <section>
          <h2 className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-4">問題文</h2>
          <div className="text-sm text-rp-100 leading-8 whitespace-pre-wrap">{problem.statement}</div>
        </section>

        {/* 制約 */}
        {problem.constraints && (
          <section className="border-t border-rp-border pt-6">
            <h2 className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-4">制約</h2>
            <div className="text-sm text-rp-100 leading-7 whitespace-pre-wrap font-mono bg-rp-800 rounded-lg border border-rp-border p-4">{problem.constraints}</div>
          </section>
        )}

        {/* 入出力形式 */}
        <div className="grid gap-4 md:grid-cols-2 border-t border-rp-border pt-6">
          {problem.inputFormat && (
            <section>
              <h2 className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-3">入力</h2>
              <pre className="text-xs text-rp-100 font-mono whitespace-pre-wrap leading-6 bg-rp-800 rounded-lg border border-rp-border p-4">{problem.inputFormat}</pre>
            </section>
          )}
          {problem.outputFormat && (
            <section>
              <h2 className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-3">出力</h2>
              <pre className="text-xs text-rp-100 font-mono whitespace-pre-wrap leading-6 bg-rp-800 rounded-lg border border-rp-border p-4">{problem.outputFormat}</pre>
            </section>
          )}
        </div>

        {/* サンプル */}
        {problem.samples.length > 0 && (
          <section className="border-t border-rp-border pt-6">
            <h2 className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-6">サンプル</h2>
            <div className="space-y-6">
              {problem.samples.map((s, i) => (
                <div key={s.id}>
                  <p className="text-xs font-mono text-rp-muted mb-3">Sample {i + 1}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-medium tracking-widest text-rp-muted uppercase mb-2">Input</p>
                      <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-xs font-mono text-rp-300 whitespace-pre-wrap min-h-[60px]">{s.input}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-widest text-rp-muted uppercase mb-2">Output</p>
                      <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-xs font-mono text-rp-success whitespace-pre-wrap min-h-[60px]">{s.expectedOutput}</pre>
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
