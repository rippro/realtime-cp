import { getSession } from "@/lib/auth/session";
import { SetupTokenSection } from "@/components/setup/SetupTokenSection";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SetupPage({ params }: PageProps) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const session = await getSession();
  const isSolver = session?.role === "solver";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-rp-100 mb-2">Setup</h1>
      <p className="text-sm text-rp-muted mb-8">CLI セットアップガイド</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">1. インストール</h2>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">npm install -g @rippro/judge@latest</pre>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">2. 初期化</h2>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">{`rj init --event ${eventId} --token <TOKEN>`}</pre>
        </section>

        <SetupTokenSection eventId={eventId} isSolver={isSolver} />

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">4. 提出</h2>
          <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">{`rj submit H7C solution.cpp\nrj submit H7C solution.py`}</pre>
        </section>

        {(session?.role === "admin" || session?.role === "creator") && (
          <section className="border-t border-rp-border pt-8">
            <h2 className="text-sm font-semibold text-rp-100 mb-4">管理者向け</h2>
            <div className="space-y-3 text-sm text-rp-muted">
              <p>トークン発行: Admin ページ → 対象チームの CLI Tokens</p>
              <p>問題管理: Creator ページ</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
