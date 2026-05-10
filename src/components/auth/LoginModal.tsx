"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getClientAuth } from "@/lib/auth/firebase-client";
import { useAuth } from "@/contexts/AuthContext";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthTab = "google" | "solver-login" | "solver-signup";
type IdStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<AuthTab>("google");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [idStatus, setIdStatus] = useState<IdStatus>("idle");
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const checkUserId = useCallback((id: string) => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    if (!id) { setIdStatus("idle"); return; }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(id)) { setIdStatus("invalid"); return; }
    setIdStatus("checking");
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/register?userId=${encodeURIComponent(id)}`);
        const d = (await res.json()) as { available: boolean };
        setIdStatus(d.available ? "available" : "taken");
      } catch {
        setIdStatus("idle");
      }
    }, 400);
  }, []);

  function resetForm() {
    setUserId("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setIdStatus("idle");
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    resetForm();
  }

  async function handleGoogle() {
    setLoading(true);
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
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "認証失敗");
        return;
      }
      await refresh();
      onClose();
    } catch (e) {
      setError("Googleログインに失敗しました");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSolverLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "ログイン失敗");
        return;
      }
      await refresh();
      onClose();
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSolverSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "登録失敗");
        return;
      }
      await refresh();
      onClose();
    } catch {
      setError("登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-rp-100/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm mx-4 rounded-xl border border-rp-border bg-rp-900 p-8 shadow-xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-rp-muted hover:text-rp-100 transition-colors"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="text-xl font-bold tracking-tight text-rp-100 mb-1">
          {tab === "solver-signup" ? "新規登録" : "ログイン"}
        </h2>
        <p className="text-sm text-rp-muted mb-7">RipPro Judge にアクセス</p>

        {/* Top tabs: Creator/Admin vs Solver */}
        <div className="flex mb-4 rounded-lg overflow-hidden border border-rp-border">
          <button
            type="button"
            onClick={() => switchTab("google")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === "google"
                ? "bg-rp-400 text-white"
                : "bg-rp-800 text-rp-muted hover:text-rp-100"
            }`}
          >
            Creator / Admin
          </button>
          <button
            type="button"
            onClick={() => switchTab("solver-login")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab !== "google"
                ? "bg-rp-400 text-white"
                : "bg-rp-800 text-rp-muted hover:text-rp-100"
            }`}
          >
            Solver
          </button>
        </div>

        {tab === "google" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-rp-border bg-rp-900 px-4 py-3 text-sm font-medium text-rp-100 transition-all hover:bg-rp-800 hover:border-rp-500 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "ログイン中..." : "Google でログイン"}
            </button>
            <p className="text-xs text-rp-muted text-center">Admin は登録メールアドレスのみ</p>
            {error && <p className="text-sm text-rp-accent text-center mt-2">{error}</p>}
          </div>
        ) : (
          <>
            {/* Login / Signup sub-tabs */}
            <div className="flex mb-5 gap-4 border-b border-rp-border">
              <button
                type="button"
                onClick={() => switchTab("solver-login")}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === "solver-login"
                    ? "border-rp-400 text-rp-100"
                    : "border-transparent text-rp-muted hover:text-rp-100"
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => switchTab("solver-signup")}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === "solver-signup"
                    ? "border-rp-400 text-rp-100"
                    : "border-transparent text-rp-muted hover:text-rp-100"
                }`}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={tab === "solver-login" ? handleSolverLogin : handleSolverSignup} className="space-y-4">
              <div>
                <label className="block text-xs text-rp-muted mb-1.5" htmlFor="userId">
                  ユーザーID
                </label>
                <div className="relative">
                  <input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      if (tab === "solver-signup") checkUserId(e.target.value);
                    }}
                    className="input-field w-full pr-8"
                    placeholder="alice"
                    autoComplete="username"
                  />
                  {tab === "solver-signup" && idStatus !== "idle" && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">
                      {idStatus === "checking" && <span className="text-rp-muted animate-pulse">…</span>}
                      {idStatus === "available" && <span className="text-rp-success">✓</span>}
                      {idStatus === "taken" && <span className="text-rp-accent">✗</span>}
                      {idStatus === "invalid" && <span className="text-rp-accent">✗</span>}
                    </span>
                  )}
                </div>
                {tab === "solver-signup" && idStatus === "taken" && (
                  <p className="text-xs text-rp-accent mt-1">そのIDは既に使われています</p>
                )}
                {tab === "solver-signup" && idStatus === "invalid" && (
                  <p className="text-xs text-rp-accent mt-1">英数字・_・-、2文字以上</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-rp-muted mb-1.5" htmlFor="password">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete={tab === "solver-login" ? "current-password" : "new-password"}
                />
              </div>
              {tab === "solver-signup" && (
                <div>
                  <label className="block text-xs text-rp-muted mb-1.5" htmlFor="confirmPassword">
                    パスワード（確認）
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-rp-muted mt-2">
                    パスワードは3文字以上
                  </p>
                </div>
              )}
              {tab === "solver-login" && (
                <p className="text-xs text-rp-muted">
                  パスワードを忘れた場合は管理者に連絡してください。
                </p>
              )}
              {error && <p className="text-sm text-rp-accent">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading
                  ? tab === "solver-signup" ? "登録中..." : "ログイン中..."
                  : tab === "solver-signup" ? "登録"  : "ログイン"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
