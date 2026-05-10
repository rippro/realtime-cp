import { getSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SetupPage({ params }: PageProps) {
  const { eventId } = await params;
  const session = await getSession();

  const steps = [
    {
      num: "01",
      title: "CLI をインストール",
      desc: "npx で直接実行可能。グローバルインストール不要。",
      code: "npx @rippro/judge@latest",
    },
    {
      num: "02",
      title: "イベントを初期化",
      desc: "イベント ID とトークンを設定します。管理者からトークンを受け取ってください。",
      code: `npx @rippro/judge@latest init\n# イベントID: ${eventId}\n# トークン: rj_live_XXXX...`,
    },
    {
      num: "03",
      title: "問題を解いて提出",
      desc: "解答ファイルを用意して submit コマンドを実行します。",
      code: `# C++
npx @rippro/judge@latest submit 001 solution.cpp

# Python
npx @rippro/judge@latest submit 001 solution.py`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-rp-100">Setup</h1>
        <p className="text-sm text-rp-muted mt-0.5">CLI セットアップガイド</p>
      </div>

      <div className="mb-8 card-surface p-5 flex items-center gap-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-rp-400/10 flex items-center justify-center text-rp-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 7v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-rp-100">イベント ID</p>
          <p className="font-mono text-base text-rp-300">{eventId}</p>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.num} className="card-surface p-6">
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 font-mono text-3xl font-extrabold text-rp-700 leading-none">
                {step.num}
              </span>
              <div className="flex-1">
                <h2 className="font-display text-base font-bold text-rp-100 mb-1">{step.title}</h2>
                <p className="text-sm text-rp-muted mb-4">{step.desc}</p>
                <pre className="rounded-lg bg-rp-900 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto whitespace-pre">
                  {step.code}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(session?.role === "admin" || session?.role === "creator") && (
        <div className="mt-8 card-surface p-6 border-rp-400/40">
          <h2 className="font-display text-base font-bold text-rp-300 mb-4">管理者向け</h2>
          <div className="space-y-3 text-sm text-rp-muted">
            <p>トークンの発行は Admin ページ → 対象チームの CLI Tokens から行えます。</p>
            <p>問題の作成・編集は Creator ページから行えます。</p>
            <div>
              <p className="mb-2">Admin API (Bearer Token) でも操作可能:</p>
              <pre className="rounded bg-rp-900 border border-rp-border p-3 text-xs font-mono text-rp-300">
                {`POST /admin/users
POST /admin/events
POST /admin/teams
POST /admin/cli-tokens`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
