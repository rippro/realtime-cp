"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { GlobalNav } from "@/components/nav/GlobalNav";
import Link from "next/link";

function EventForm({ onCreated }: { onCreated: (e: Event) => void }) {
  const [id, setId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const r = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, startsAt, endsAt, isActive }),
      });
      const data = (await r.json()) as Event & { error?: string };
      if (!r.ok) { setError(data.error ?? "作成失敗"); return; }
      onCreated(data);
      setId(""); setStartsAt(""); setEndsAt(""); setIsActive(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card-surface p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-rp-100">新規イベント作成</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-rp-muted mb-1">Event ID</label>
          <input
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. contest-2025-01"
            className="input-field w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-rp-muted mb-1">開始</label>
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-rp-muted mb-1">終了</label>
          <input
            required
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-rp-muted">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-rp-400"
          />
          作成と同時に公開 (isActive)
        </label>
        {error && <p className="text-xs text-rp-accent">{error}</p>}
        <button type="submit" disabled={saving} className="ml-auto btn-primary py-1.5 px-4 text-sm disabled:opacity-50">
          {saving ? "作成中..." : "作成"}
        </button>
      </div>
    </form>
  );
}

type AdminTab = "events" | "users" | "problems";

interface User { id: string; createdAt: string }
interface Event { id: string; isActive: boolean; startsAt: string; endsAt: string; problemCount?: number; teamCount?: number }
interface Problem { eventId: string; id: string; title: string; isPublished: boolean; creatorUid: string | null }

const stats = [
  { label: "Events", valueKey: "events", colorClass: "text-rp-highlight" },
  { label: "Users", valueKey: "users", colorClass: "text-rp-warning" },
  { label: "Problems", valueKey: "problems", colorClass: "text-rp-success" },
] as const;

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-rp-400 text-white" : "text-rp-muted hover:text-rp-100 hover:bg-rp-700"
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
  const [deleteEventConfirm, setDeleteEventConfirm] = useState<string | null>(null);
  const [togglingEvent, setTogglingEvent] = useState<string | null>(null);

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

  async function deleteEvent(eventId: string) {
    await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    setEvents((es) => es.filter((e) => e.id !== eventId));
    setDeleteEventConfirm(null);
  }

  async function toggleEventActive(eventId: string, current: boolean) {
    setTogglingEvent(eventId);
    try {
      const r = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, isActive: !current }),
      });
      if (r.ok) {
        setEvents((es) => es.map((e) => e.id === eventId ? { ...e, isActive: !current } : e));
      }
    } finally {
      setTogglingEvent(null);
    }
  }

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
            {stats.map((s) => (
              <div key={s.label} className="card-surface p-5">
                <div className={`font-mono text-3xl font-extrabold ${s.colorClass}`}>
                  {s.valueKey === "events" ? events.length : s.valueKey === "users" ? users.length : allProblems.length}
                </div>
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
              </div>
              <EventForm onCreated={(e) => setEvents((es) => [e, ...es])} />
              {events.map((e) => {
                const now = new Date();
                const ended = now > new Date(e.endsAt);
                const statusLabel = e.isActive && !ended ? "LIVE" : ended ? "ENDED" : "DRAFT";
                return (
                  <div key={e.id} className="card-surface flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display text-sm font-semibold text-rp-100">{e.id}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                          statusLabel === "LIVE" ? "badge-active" : "text-rp-muted border-rp-border"
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-rp-muted">
                        {new Date(e.startsAt).toLocaleString("ja-JP")} → {new Date(e.endsAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => toggleEventActive(e.id, e.isActive)}
                        disabled={togglingEvent === e.id}
                        className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
                          e.isActive
                            ? "border-rp-success/40 text-rp-success hover:bg-rp-success/10"
                            : "border-rp-border text-rp-muted hover:text-rp-100 hover:bg-rp-700"
                        }`}
                      >
                        {e.isActive ? "公開中" : "非公開"}
                      </button>
                      <Link href={`/events/${e.id}`} className="btn-ghost py-1.5 px-3 text-xs">表示</Link>
                      <Link href={`/events/${e.id}/settings`} className="btn-ghost py-1.5 px-3 text-xs">設定</Link>
                      {deleteEventConfirm === e.id ? (
                        <>
                          <button type="button" onClick={() => deleteEvent(e.id)} className="text-xs px-3 py-1.5 rounded bg-rp-accent text-white hover:opacity-90">削除確認</button>
                          <button type="button" onClick={() => setDeleteEventConfirm(null)} className="btn-ghost py-1.5 px-2 text-xs">×</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setDeleteEventConfirm(e.id)} className="btn-ghost py-1.5 px-3 text-xs text-rp-accent border-rp-accent/30 hover:bg-rp-accent/10">削除</button>
                      )}
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
