import Link from "next/link";
import { GlobalNav } from "@/components/nav/GlobalNav";

export default function Home() {
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">

        {/* Hero */}
        <section className="border-b border-rp-border">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-5">
                競技プログラミング新歓向け
              </p>
              <h1 className="text-5xl font-extrabold tracking-tight text-rp-100 sm:text-6xl lg:text-7xl mb-6 leading-[1.05]">
                RipPro<br />Judge
              </h1>
              <p className="text-lg text-rp-500 leading-relaxed mb-10 max-w-lg">
                ローカル実行型ジャッジシステム。コードはサーバーに送らない。
                テストケース配布と AC 記録だけをサーバーが担当。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/events" className="btn-primary inline-flex items-center gap-2">
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/>
                  </svg>
                  npm install
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-rp-border">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-0 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-rp-border">
              {[
                {
                  num: "01",
                  title: "ローカル実行",
                  desc: "提出コードはサーバーに送信されない。すべてあなたの PC 上で動作する。",
                },
                {
                  num: "02",
                  title: "リアルタイム AC",
                  desc: "全テストケース AC 時のみサーバーへ報告。ランキングに即座に反映。",
                },
                {
                  num: "03",
                  title: "CLI ツール",
                  desc: "npx @rippro/judge@latest で即実行。C++ / Python 両対応。",
                },
              ].map((f) => (
                <div key={f.num} className="px-8 py-10 first:pl-0 last:pr-0">
                  <p className="text-xs font-mono text-rp-highlight mb-4">{f.num}</p>
                  <h3 className="text-lg font-bold text-rp-100 mb-3">{f.title}</h3>
                  <p className="text-sm text-rp-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick start */}
        <section>
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="text-sm font-medium tracking-widest text-rp-muted uppercase mb-10">
              Quick Start
            </h2>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-rp-300 mb-3">1. CLI をインストール</p>
                <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-400 overflow-x-auto">
                  <code>npx @rippro/judge@latest</code>
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium text-rp-300 mb-3">2. イベントに参加して提出</p>
                <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-400 overflow-x-auto">
                  <code>{`# イベント初期化
npx @rippro/judge@latest init

# 解答を提出
npx @rippro/judge@latest submit 001 solution.cpp`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-rp-border">
          <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
            <span className="text-sm font-bold text-rp-100">RipPro</span>
            <p className="text-xs text-rp-muted">競技プログラミング新歓向けジャッジシステム</p>
          </div>
        </footer>
      </main>
    </>
  );
}
