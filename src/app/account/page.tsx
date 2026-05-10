"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlobalNav } from "@/components/nav/GlobalNav";

export default function AccountPage() {
  const { session, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [session, loading, router]);

  if (loading || !session) {
    return (
      <>
        <GlobalNav />
        <div className="min-h-screen bg-rp-900 pt-14 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="font-display text-2xl font-bold text-rp-100 mb-8">アカウント設定</h1>

          <div className="card-surface p-6 space-y-4">
            <div>
              <p className="text-xs text-rp-muted mb-1">ロール</p>
              <span className={`inline-block text-xs font-mono px-2 py-1 rounded border ${
                session.role === "admin"
                  ? "bg-rp-accent/20 text-rp-accent border-rp-accent/30"
                  : session.role === "creator"
                  ? "bg-rp-400/20 text-rp-300 border-rp-400/30"
                  : "bg-rp-success/20 text-rp-success border-rp-success/30"
              }`}>
                {session.role.toUpperCase()}
              </span>
            </div>

            {(session.role === "admin" || session.role === "creator") ? (
              <>
                <div>
                  <p className="text-xs text-rp-muted mb-1">メールアドレス</p>
                  <p className="text-sm text-rp-100 font-mono">{session.email}</p>
                </div>
                <div>
                  <p className="text-xs text-rp-muted mb-1">表示名</p>
                  <p className="text-sm text-rp-100">{session.name}</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-rp-muted mb-1">ユーザーID</p>
                <p className="text-sm text-rp-100 font-mono">{session.role === "solver" ? session.userId : ""}</p>
              </div>
            )}

            <div className="pt-4 border-t border-rp-border">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="btn-ghost text-rp-accent border-rp-accent/30 hover:bg-rp-accent/10 hover:border-rp-accent"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
