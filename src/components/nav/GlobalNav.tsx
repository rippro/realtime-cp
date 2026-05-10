"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/auth/LoginModal";
import { getSessionDisplayName } from "@/lib/auth/types";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
];

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = session ? getSessionDisplayName(session).slice(0, 2).toUpperCase() : "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rp-400/20 border border-rp-400/40 text-xs font-mono font-semibold text-rp-300 hover:bg-rp-400/30 transition-colors"
      >
        {initials}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-rp-border bg-rp-800 shadow-2xl overflow-hidden z-[100] animate-scale-in"
        >
          {session && (
            <div className="px-4 py-3 border-b border-rp-border">
              <p className="text-xs text-rp-muted">ログイン中</p>
              <p className="text-sm font-medium text-rp-100 truncate mt-0.5">
                {getSessionDisplayName(session)}
              </p>
              <span className={`inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                session.role === "admin"
                  ? "bg-rp-accent/20 text-rp-accent border border-rp-accent/30"
                  : session.role === "creator"
                  ? "bg-rp-400/20 text-rp-300 border border-rp-400/30"
                  : "bg-rp-success/20 text-rp-success border border-rp-success/30"
              }`}>
                {session.role.toUpperCase()}
              </span>
            </div>
          )}
          <Link
            href="/account"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-rp-muted hover:text-rp-100 hover:bg-rp-700 transition-colors"
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
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rp-muted hover:text-rp-accent hover:bg-rp-700 transition-colors"
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
  const { session, loading, logout } = useAuth();
  const pathname = usePathname();
  const [loginOpen, setLoginOpen] = useState(false);

  const extraLinks = [];
  if (session?.role === "creator" || session?.role === "admin") {
    extraLinks.push({ href: "/creator", label: "Creator" });
  }
  if (session?.role === "admin") {
    extraLinks.push({ href: "/admin", label: "Admin" });
  }

  const allLinks = [...navLinks, ...extraLinks];

  return (
    <>
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50 h-14">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-rp-400 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-display text-sm font-bold text-rp-100 tracking-wide">
                RipPro
              </span>
            </Link>

            <div className="flex items-center gap-1">
              {allLinks.map((link) => {
                const active = link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-rp-400/20 text-rp-300"
                        : "text-rp-muted hover:text-rp-100 hover:bg-rp-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!loading && (
              session ? (
                <AccountMenu onLogout={logout} />
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="btn-primary py-1.5 px-4 text-sm"
                >
                  ログイン
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
