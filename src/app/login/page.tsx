"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getClientAuth } from "@/lib/auth/firebase-client";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { session, loading, refresh } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"google" | "solver">("google");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.push("/");
  }, [session, loading, router]);

  async function handleGoogle() {
    setSubmitting(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(getClientAuth(), provider);
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        setError("認証に失敗しました");
        return;
      }
      await refresh();
      router.push("/");
    } catch {
      setError("Googleログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSolver(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      if (!res.ok) {
        setError("IDまたはパスワードが違います");
        return;
      }
      await refresh();
      router.push("/");
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-rp-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rp-400/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="h-8 w-8 rounded-lg bg-rp-400 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold text-rp-100">RipPro Judge</span>
        </Link>

        <div className="card-surface p-8">
          <h1 className="font-display text-xl font-bold text-rp-100 mb-1 text-center">ログイン</h1>
          <p className="text-sm text-rp-muted text-center mb-6">アカウントにアクセス</p>

          <div className="flex mb-6 rounded-xl overflow-hidden border border-rp-border">
            {(["google", "solver"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === t ? "bg-rp-400 text-rp-100" : "bg-rp-700 text-rp-muted hover:text-rp-100"
                }`}
              >
                {t === "google" ? "Creator / Admin" : "Solver"}
              </button>
            ))}
          </div>

          {tab === "google" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-rp-border bg-rp-700 px-4 py-3.5 text-sm font-medium text-rp-100 transition-all hover:bg-rp-600 hover:border-rp-500 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {submitting ? "処理中..." : "Google でログイン"}
              </button>
              <p className="text-xs text-rp-muted text-center">
                Admin は指定のメールアドレスのみ認可
              </p>
              {error && <p className="text-sm text-rp-accent text-center">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSolver} className="space-y-4">
              <div>
                <label className="block text-xs text-rp-muted mb-1.5" htmlFor="userId">ユーザーID</label>
                <input id="userId" type="text" value={userId} onChange={(e) => setUserId(e.target.value)} className="input-field" placeholder="alice" autoComplete="username" required />
              </div>
              <div>
                <label className="block text-xs text-rp-muted mb-1.5" htmlFor="password">パスワード</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" autoComplete="current-password" required />
              </div>
              <p className="text-xs text-rp-muted">パスワードを忘れた場合は管理者に連絡してください。</p>
              {error && <p className="text-sm text-rp-accent">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
                {submitting ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
