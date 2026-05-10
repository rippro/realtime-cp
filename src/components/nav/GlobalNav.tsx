"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoginModal } from "@/components/auth/LoginModal";
import { getSessionDisplayName } from "@/lib/auth/types";
import { getRecentAccounts, removeRecentAccount, type RecentAccount } from "@/lib/auth/recent-accounts";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
];

interface SwitchTarget {
  tab: "google" | "solver-login";
  userId?: string;
  savedToken?: string;
}

function AccountMenu({
  onLogout,
  onSwitch,
}: {
  onLogout: () => void;
  onSwitch: (target: SwitchTarget) => Promise<void>;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<RecentAccount[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setRecents(getRecentAccounts());
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentId = session
    ? session.role === "solver"
      ? session.userId
      : session.uid
    : null;

  const others = recents.filter((a) => a.id !== currentId);
  const displayName = session ? getSessionDisplayName(session) : "?";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rp-400 text-xs font-semibold text-white hover:bg-rp-300 transition-colors"
      >
        {initials}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-rp-border bg-rp-900 shadow-lg overflow-hidden z-[100] animate-scale-in"
        >
          {/* current account */}
          {session && (
            <div className="px-4 py-3 border-b border-rp-border">
              <p className="text-xs text-rp-muted">ログイン中</p>
              <p className="text-sm font-medium text-rp-100 truncate mt-0.5">{displayName}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                session.role === "admin"
                  ? "bg-rp-accent/10 text-rp-accent border border-rp-accent/25"
                  : session.role === "creator"
                  ? "bg-rp-400/10 text-rp-400 border border-rp-400/25"
                  : "bg-rp-700 text-rp-success border border-rp-success/25"
              }`}>
                {session.role.toUpperCase()}
              </span>
            </div>
          )}

          {/* other recent accounts */}
          {others.length > 0 && (
            <div className="border-b border-rp-border py-1">
              <p className="px-4 pt-1 pb-0.5 text-[10px] text-rp-muted uppercase tracking-wider">切り替え</p>
              {others.map((a) => (
                <div key={a.id} className="flex items-center group">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (a.role === "solver") {
                        void onSwitch({ tab: "solver-login", userId: a.id, savedToken: a.token });
                      } else {
                        void onSwitch({ tab: "google", savedToken: a.token });
                      }
                    }}
                    className="flex-1 flex items-center gap-2.5 px-4 py-2 text-sm text-rp-500 hover:text-rp-100 hover:bg-rp-800 transition-colors text-left"
                  >
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-rp-700 flex items-center justify-center text-[10px] font-mono text-rp-300">
                      {a.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{a.displayName}</span>
                      <span className="block text-[10px] text-rp-muted">{a.role}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeRecentAccount(a.id);
                      setRecents((r) => r.filter((x) => x.id !== a.id));
                    }}
                    className="px-2 py-2 text-rp-muted hover:text-rp-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { setOpen(false); onSwitch({ tab: "solver-login" }); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rp-muted hover:text-rp-100 hover:bg-rp-800 transition-colors"
              >
                <span className="text-rp-muted">+</span>
                別のアカウントでログイン
              </button>
            </div>
          )}

          {others.length === 0 && (
            <div className="border-b border-rp-border">
              <button
                type="button"
                onClick={() => { setOpen(false); onSwitch({ tab: "solver-login" }); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rp-muted hover:text-rp-100 hover:bg-rp-800 transition-colors"
              >
                <span>+</span>
                別のアカウントでログイン
              </button>
            </div>
          )}

          <Link
            href="/account"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-rp-500 hover:text-rp-100 hover:bg-rp-800 transition-colors"
            onClick={() => setOpen(false)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            アカウント設定
          </Link>
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rp-500 hover:text-rp-accent hover:bg-rp-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}

export function GlobalNav() {
  const { session, loading, logout, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginInitialTab, setLoginInitialTab] = useState<"google" | "solver-login" | "solver-signup" | undefined>();
  const [loginInitialUserId, setLoginInitialUserId] = useState<string | undefined>();

  const extraLinks = [];
  if (session?.role === "creator" || session?.role === "admin") {
    extraLinks.push({ href: "/creator", label: "Creator" });
  }
  if (session?.role === "admin") {
    extraLinks.push({ href: "/admin", label: "Admin" });
  }

  const allLinks = [...navLinks, ...extraLinks];

  async function openSwitch(target: SwitchTarget) {
    if (target.savedToken) {
      const res = await fetch("/api/auth/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: target.savedToken }),
      });
      if (res.ok) {
        await refresh();
        return;
      }
    }
    if (target.tab === "google") {
      // fallback: Google popup
      try {
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const { getClientAuth } = await import("@/lib/auth/firebase-client");
        const result = await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
        const idToken = await result.user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        await refresh();
      } catch { /* popup cancelled */ }
      return;
    }
    setLoginInitialTab(target.tab);
    setLoginInitialUserId(target.userId);
    setLoginOpen(true);
  }

  return (
    <>
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50 h-14">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-0.5">
              <span className="font-bold text-base tracking-tight text-rp-100">RipPro</span>
            </Link>

            <div className="flex items-center gap-1">
              {allLinks.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active ? "text-rp-highlight font-medium" : "text-rp-muted hover:text-rp-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-md text-rp-muted hover:text-rp-100 hover:bg-rp-800 transition-colors"
              aria-label="テーマ切替"
            >
              {theme === "dark" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            {!loading && (
              session ? (
                <AccountMenu onLogout={logout} onSwitch={openSwitch} />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLoginInitialTab(undefined);
                    setLoginInitialUserId(undefined);
                    setLoginOpen(true);
                  }}
                  className="btn-primary py-1.5 px-4 text-sm"
                >
                  ログイン
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        initialTab={loginInitialTab}
        initialUserId={loginInitialUserId}
      />
    </>
  );
}
