import { SetupCodeBlock } from "@/components/setup/SetupCodeBlock";
import { SetupTokenSection } from "@/components/setup/SetupTokenSection";
import { getSession } from "@/lib/auth/session";

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
          <SetupCodeBlock code="npm install -g @rippro/judge@latest" />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">2. 初期化</h2>
          <SetupCodeBlock code={`rj init`} />
        </section>

        <SetupTokenSection eventId={eventId} isSolver={isSolver} />

        <section>
          <h2 className="text-sm font-semibold text-rp-100 mb-2">4. 提出</h2>
          <SetupCodeBlock code={`rj submit H7C solution.cpp\nrj submit H7C solution.py`} />
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
