import { getSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SetupPage({ params }: PageProps) {
  const { eventId } = await params;
  const session = await getSession();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-rp-100 mb-2">Setup</h1>
      <p className="text-sm text-rp-muted mb-8">CLI セットアップガイド</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">1. インストール</h2>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">npx @rippro/judge@latest</pre>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">2. 初期化</h2>
          <p className="text-sm text-rp-muted mb-2">管理者からトークンを受け取り、以下を実行。</p>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">{`npx @rippro/judge@latest init
# Event ID: ${eventId}
# Token: rj_live_XXXX...`}</pre>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">3. 提出</h2>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">{`npx @rippro/judge@latest submit 001 solution.cpp
npx @rippro/judge@latest submit 001 solution.py`}</pre>
        </section>

        {(session?.role === "admin" || session?.role === "creator") && (
          <section className="border-t border-rp-border pt-8">
            <h2 className="text-sm font-semibold text-rp-100 mb-4">管理者向け</h2>
            <div className="space-y-3 text-sm text-rp-muted">
              <p>トークン発行: Admin ページ → 対象チームの CLI Tokens</p>
              <p>問題管理: Creator ページ</p>
              <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 font-mono text-rp-300 overflow-x-auto">{`POST /admin/users
POST /admin/events
POST /admin/teams
POST /admin/cli-tokens`}</pre>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
