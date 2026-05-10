"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { GlobalNav } from "@/components/nav/GlobalNav";
import Link from "next/link";

type AdminTab = "events" | "users" | "problems";

interface User { id: string; createdAt: string }
interface Event { id: string; isActive: boolean; startsAt: string; endsAt: string; problemCount?: number; teamCount?: number }
interface Problem { eventId: string; id: string; title: string; isPublished: boolean; creatorUid: string | null }

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-rp-400 text-rp-100" : "text-rp-muted hover:text-rp-100 hover:bg-rp-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("events");
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) { router.push("/login"); return; }
    if (!loading && session?.role !== "admin") { router.push("/"); return; }
  }, [session, loading, router]);

  useEffect(() => {
    if (loading || session?.role !== "admin") return;

    fetch("/api/admin/users")
      .then((r) => r.json() as Promise<{ users: User[] }>)
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});

    fetch("/api/events")
      .then((r) => r.json() as Promise<{ events: Event[] }>)
      .then((d) => {
        setEvents(d.events ?? []);
        // Fetch problems for all events
        return Promise.all(
          (d.events ?? []).map((ev) =>
            fetch(`/api/events/${ev.id}/problems`)
              .then((r) => r.json() as Promise<{ problems: Problem[] }>)
              .then((pd) => pd.problems ?? [])
              .catch(() => [] as Problem[]),
          ),
        );
      })
      .then((perEvent) => setAllProblems(perEvent.flat()))
      .catch(() => {});
  }, [loading, session]);

  async function deleteUser(userId: string) {
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setUsers((us) => us.filter((u) => u.id !== userId));
    setDeleteUserConfirm(null);
  }

  if (loading) return null;

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-rp-accent/20 text-rp-accent border-rp-accent/30">
                  ADMIN
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-rp-100">Admin Dashboard</h1>
              <p className="text-sm text-rp-muted mt-1">全権限でシステムを管理</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Events", value: events.length, color: "rp-400" },
              { label: "Users", value: users.length, color: "rp-warning" },
              { label: "Problems", value: allProblems.length, color: "rp-success" },
            ].map((s) => (
              <div key={s.label} className="card-surface p-5">
                <div className={`font-mono text-3xl font-extrabold text-${s.color}`}>{s.value}</div>
                <div className="text-xs text-rp-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-rp-800 rounded-xl w-fit border border-rp-border">
            <TabButton active={tab === "events"} onClick={() => setTab("events")}>Events</TabButton>
            <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users</TabButton>
            <TabButton active={tab === "problems"} onClick={() => setTab("problems")}>Problems</TabButton>
          </div>

          {/* Events Tab */}
          {tab === "events" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-rp-100">Events ({events.length})</h2>
                <p className="text-xs text-rp-muted">新規作成は Admin API (POST /admin/events) で</p>
              </div>
              {events.map((e) => {
                const now = new Date();
                const ended = now > new Date(e.endsAt);
                return (
                  <div key={e.id} className="card-surface flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display text-sm font-semibold text-rp-100">{e.id}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                          e.isActive && !ended ? "badge-active" : "badge-inactive"
                        }`}>
                          {e.isActive && !ended ? "LIVE" : ended ? "ENDED" : "DRAFT"}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-rp-muted">
                        {new Date(e.startsAt).toLocaleDateString("ja-JP")} → {new Date(e.endsAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${e.id}`} className="btn-ghost py-1.5 px-3 text-xs">表示</Link>
                      <Link href={`/events/${e.id}/settings`} className="btn-ghost py-1.5 px-3 text-xs">設定</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Users Tab */}
          {tab === "users" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-rp-100">Users ({users.length})</h2>
                <p className="text-xs text-rp-muted">新規作成は Admin API (POST /admin/users) で</p>
              </div>
              {users.map((u) => (
                <div key={u.id} className="card-surface flex items-center gap-4 px-5 py-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-rp-700 flex items-center justify-center">
                    <span className="font-mono text-xs text-rp-300">{u.id.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm text-rp-100">{u.id}</p>
                    <p className="font-mono text-xs text-rp-muted">作成: {new Date(u.createdAt).toLocaleDateString("ja-JP")}</p>
                  </div>
                  <div className="flex gap-2">
                    {deleteUserConfirm === u.id ? (
                      <>
                        <button type="button" onClick={() => deleteUser(u.id)} className="text-xs px-3 py-1.5 rounded bg-rp-accent text-white hover:opacity-90">削除確認</button>
                        <button type="button" onClick={() => setDeleteUserConfirm(null)} className="btn-ghost py-1.5 px-2 text-xs">×</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setDeleteUserConfirm(u.id)} className="btn-ghost py-1.5 px-3 text-xs text-rp-accent border-rp-accent/30 hover:bg-rp-accent/10">削除</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Problems Tab */}
          {tab === "problems" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-rp-100">All Problems ({allProblems.length})</h2>
              </div>
              {allProblems.length === 0 ? (
                <div className="card-surface p-10 text-center"><p className="text-rp-muted">問題がありません</p></div>
              ) : (
                allProblems.map((p) => (
                  <div key={`${p.eventId}/${p.id}`} className="card-surface flex items-center gap-4 px-5 py-4">
                    <div className="flex-shrink-0 font-mono text-xs text-rp-muted w-20">{p.eventId.slice(0, 12)}</div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rp-700 flex items-center justify-center">
                      <span className="font-mono text-xs font-bold text-rp-300">{p.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold text-rp-100 truncate">{p.title}</span>
                        {!p.isPublished && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rp-muted/30 text-rp-muted">DRAFT</span>}
                        {p.isPublished && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded badge-active">LIVE</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${p.eventId}/problems/${p.id}`} className="btn-ghost py-1.5 px-3 text-xs">表示</Link>
                      <Link href={`/creator`} className="btn-ghost py-1.5 px-3 text-xs">編集</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
