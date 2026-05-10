import Link from "next/link";
import { GlobalNav } from "@/components/nav/GlobalNav";

export default function Home() {
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-rp-400/5 rounded-full blur-[120px]" />
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-rp-accent/5 rounded-full blur-[80px]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-6 py-28">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rp-border bg-rp-800/60 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rp-success animate-pulse" />
                <span className="text-xs font-mono text-rp-muted">v1 · ローカル実行型</span>
              </div>
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-rp-100 sm:text-6xl lg:text-7xl mb-6 leading-none">
                RipPro
                <span className="text-rp-400"> Judge</span>
              </h1>
              <p className="text-lg text-rp-muted leading-relaxed mb-10 max-w-xl">
                競プロ新歓向けのローカル実行ジャッジシステム。
                サーバーはテストケース配布と AC 記録だけを担当、実行はすべてあなたのマシンで。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  イベントを見る
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <a
                  href="https://www.npmjs.com/package/@rippro/judge"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost inline-flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 0h24v24H0V0zm0 0h24v24H0V0zM6.763 3.146c.342 0 .616.274.616.616v5.128l2.056-2.056c.24-.24.627-.24.867 0 .24.24.24.627 0 .867l-3.09 3.09c-.12.12-.276.18-.433.18s-.313-.06-.433-.18L3.25 7.701c-.24-.24-.24-.627 0-.867.24-.24.627-.24.867 0L6.147 8.89V3.762c0-.342.274-.616.616-.616z"/>
                  </svg>
                  CLI インストール
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M10 2v18M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                ),
                title: "ローカル実行",
                desc: "提出コードはサーバーに送信されない。すべてあなたの PC 上で動作。",
                color: "rp-400",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                title: "リアルタイム AC",
                desc: "全テストケース AC 時のみサーバーへ報告。ランキングに即座に反映。",
                color: "rp-success",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 4h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7 15h6M10 12v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                title: "CLI ツール",
                desc: "npx @rippro/judge@latest で即実行。C++ / Python 両対応。",
                color: "rp-warning",
              },
            ].map((f) => (
              <div key={f.title} className="card-surface p-6 group hover:border-rp-500 transition-colors">
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${f.color}/10 text-${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-display text-base font-bold text-rp-100 mb-2">{f.title}</h3>
                <p className="text-sm text-rp-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section className="border-t border-rp-border bg-rp-800/40">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="font-display text-2xl font-bold text-rp-100 mb-8">クイックスタート</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm text-rp-muted mb-3">1. CLI をインストール</p>
                <pre className="rounded-lg bg-rp-900 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">
                  <code>npx @rippro/judge@latest</code>
                </pre>
              </div>
              <div>
                <p className="text-sm text-rp-muted mb-3">2. イベントに参加して提出</p>
                <pre className="rounded-lg bg-rp-900 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto">
                  <code>{`# イベント初期化
npx @rippro/judge@latest init

# 問題を解いて提出
npx @rippro/judge@latest submit 001 solution.cpp`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
