import Link from "next/link";
import { GlobalNav } from "@/components/nav/GlobalNav";

export default function Home() {
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">

        {/* Hero */}
        <section>
          <div className="mx-auto max-w-7xl px-6">

            <div className="py-4 flex items-center justify-between border-b border-rp-border">
              <span className="text-[10px] font-mono text-rp-muted tracking-[0.22em] uppercase">
                Competitive Programming Judge System
              </span>
              <span className="text-[10px] font-mono text-rp-muted tracking-[0.1em]">2025</span>
            </div>

            <div className="grid lg:grid-cols-[1fr_400px] gap-16 items-start py-20 lg:py-28 border-b border-rp-border">
              <div className="flex flex-col justify-between h-full min-h-[320px]">
                <div>
                  <h1
                    className="font-black text-rp-100 leading-[0.83] tracking-[-0.05em] mb-10"
                    style={{ fontSize: "clamp(60px, 8.5vw, 100px)" }}
                  >
                    RipPro<br />
                    <span className="text-rp-300">Judge.</span>
                  </h1>
                  <p className="text-[14px] text-rp-500 leading-[1.85] max-w-[380px] font-normal">
                    提出コードはサーバーに送らない。テストケース配布と AC 記録だけをサーバーが担う。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 mt-12">
                  <Link href="/events" className="btn-primary inline-flex items-center gap-2">
                    イベントに参加する
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <a
                    href="https://www.npmjs.com/package/@rippro/judge"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <span className="font-mono text-[11px]">npm</span>
                    @rippro/judge
                  </a>
                </div>
              </div>

              {/* Terminal */}
              <div className="hidden lg:block border border-rp-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-rp-border bg-rp-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-rp-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-rp-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-rp-border" />
                  <span className="ml-3 text-[10px] font-mono text-rp-muted tracking-[0.05em]">
                    rippro-judge — zsh
                  </span>
                </div>
                <div className="p-6 font-mono text-[12px] leading-loose space-y-px" style={{ background: "#111" }}>
                  <p>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>~ $</span>{" "}
                    <span style={{ color: "#fff" }}>npx @rippro/judge@latest</span>
                  </p>
                  <p style={{ color: "#5BC898" }}>✓ Authenticated: alice</p>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>  Event: Shinkan Contest 2025</p>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>  3 problems available</p>
                  <p className="pt-3">
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>~ $</span>{" "}
                    <span style={{ color: "#fff" }}>rj submit H7C solution.cpp</span>
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>  Compiling...</p>
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>  Running 42 test cases...</p>
                  <p style={{ color: "#5BC898", fontWeight: 600 }}>✓ AC — A solved! (42/42)</p>
                  <p className="pt-1" style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>
                    Score +100pt  ·  Rank #3  ↑2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features — editorial row layout */}
        <section className="border-b border-rp-border">
          <div className="mx-auto max-w-7xl px-6">
            {[
              {
                num: "01",
                title: "ローカル実行",
                desc: "提出コードはサーバーに送信されない。コンパイルと実行はすべてあなたの PC 上で行われる。",
              },
              {
                num: "02",
                title: "リアルタイム AC",
                desc: "全テストケース AC 時のみサーバーへ報告。ランキングへの反映は即座。",
              },
              {
                num: "03",
                title: "CLI ツール",
                desc: "npx @rippro/judge@latest で即実行。グローバルインストール不要。C++ / Python 対応。",
              },
            ].map((f, i) => (
              <div
                key={f.num}
                className={`grid grid-cols-1 md:grid-cols-[56px_200px_1fr] gap-x-10 gap-y-1 items-baseline py-8 ${i < 2 ? "border-b border-rp-border" : ""}`}
              >
                <span className="text-[10px] font-mono text-rp-muted tracking-[0.12em]">
                  {f.num}
                </span>
                <h3 className="text-[13px] font-semibold text-rp-100 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-[13px] text-rp-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section className="border-b border-rp-border bg-rp-800">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-center gap-6 mb-10">
              <span className="text-[10px] font-mono text-rp-muted tracking-[0.2em] uppercase whitespace-nowrap">
                Quick Start
              </span>
              <div className="flex-1 border-t border-rp-border" />
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-mono text-rp-muted mb-4 tracking-[0.1em]">
                  01 — CLI を起動
                </p>
                <pre className="rounded border border-rp-border bg-rp-900 px-5 py-4 text-[13px] font-mono text-rp-400 overflow-x-auto">
                  <code>npx @rippro/judge@latest</code>
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-mono text-rp-muted mb-4 tracking-[0.1em]">
                  02 — 問題を解いて提出
                </p>
                <pre className="rounded border border-rp-border bg-rp-900 px-5 py-4 text-[13px] font-mono text-rp-400 overflow-x-auto">
                  <code>rj submit 7XA solution.cpp</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
            <span className="text-[13px] font-bold text-rp-100 tracking-tight">RipPro</span>
            <p className="text-[10px] font-mono text-rp-muted tracking-[0.05em]">
              競技プログラミング新歓向けジャッジシステム
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
