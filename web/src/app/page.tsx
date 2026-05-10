import { devCliToken } from "@/lib/judge/repository";

const eventId = "rippro-2026-spring";
const problemId = "001";

export default function Home() {
  const configPath = `/judge/events/${eventId}/problems/${problemId}/config`;
  const testcasesPath = `/judge/events/${eventId}/problems/${problemId}/testcases?version=v1`;
  const submissionsPath = `/judge/events/${eventId}/problems/${problemId}/submissions`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-[34vh] max-w-6xl flex-col justify-end gap-6 px-6 py-12">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">RipPro Judge</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              競プロ新歓向けのローカル実行ジャッジ補助システム
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              サーバーは提出コードを実行せず、CLIが参加者PC上でテストを実行します。
              サーバー側は問題設定、テストケース配布、AC記録のみを扱います。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">実装済みAPI</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Method</th>
                    <th className="py-2 pr-4 font-medium">Path</th>
                    <th className="py-2 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 pr-4 font-mono">GET</td>
                    <td className="py-3 pr-4 font-mono">{configPath}</td>
                    <td className="py-3">問題設定取得</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono">GET</td>
                    <td className="py-3 pr-4 font-mono">{testcasesPath}</td>
                    <td className="py-3">現在バージョンのテストケース取得</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono">POST</td>
                    <td className="py-3 pr-4 font-mono">{submissionsPath}</td>
                    <td className="py-3">AC提出とsolve記録</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">開発用シード</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
              <dt className="text-muted-foreground">eventId</dt>
              <dd className="font-mono">{eventId}</dd>
              <dt className="text-muted-foreground">problemId</dt>
              <dd className="font-mono">{problemId}</dd>
              <dt className="text-muted-foreground">token</dt>
              <dd className="break-all font-mono">{devCliToken}</dd>
            </dl>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">サーバー責務</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>Bearer tokenをSHA-256で照合する</li>
            <li>teamIdからeventIdを検証する</li>
            <li>active eventとpublished problemだけを返す</li>
            <li>AC以外の提出は保存しない</li>
            <li>solvesはチームごとに最初のACだけを保持する</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
