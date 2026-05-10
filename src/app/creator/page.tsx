"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { GlobalNav } from "@/components/nav/GlobalNav";
import Link from "next/link";

interface Problem {
  eventId: string;
  id: string;
  title: string;
  isPublished: boolean;
  creatorUid: string | null;
  updatedAt: string;
}

interface Event {
  id: string;
  isActive: boolean;
}

function ProblemForm({
  eventId,
  initial,
  onSave,
  onCancel,
}: {
  eventId: string;
  initial?: Partial<Problem>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    title: initial?.title ?? "",
    statement: "",
    constraints: "",
    inputFormat: "",
    outputFormat: "",
    timeLimitMs: 2000,
    allowedLanguages: "cpp,python",
    testcaseVersion: "v1",
    isPublished: initial?.isPublished ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(initial?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = isEdit
        ? `/api/events/${eventId}/problems/${form.id}`
        : `/api/events/${eventId}/problems`;
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        ...form,
        allowedLanguages: form.allowedLanguages.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "保存に失敗しました");
        return;
      }
      onSave();
    } catch {
      setError("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-xs text-rp-muted mb-1.5">問題 ID (例: 001)</label>
          <input className="input-field" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="001" required />
        </div>
      )}
      <div>
        <label className="block text-xs text-rp-muted mb-1.5">タイトル</label>
        <input className="input-field" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="A + B 問題" required />
      </div>
      <div>
        <label className="block text-xs text-rp-muted mb-1.5">問題文</label>
        <textarea className="input-field min-h-[100px] resize-y" value={form.statement} onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-rp-muted mb-1.5">制約</label>
          <textarea className="input-field min-h-[80px] resize-y" value={form.constraints} onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-rp-muted mb-1.5">入力形式</label>
          <textarea className="input-field min-h-[80px] resize-y" value={form.inputFormat} onChange={(e) => setForm((f) => ({ ...f, inputFormat: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-rp-muted mb-1.5">出力形式</label>
          <textarea className="input-field min-h-[80px] resize-y" value={form.outputFormat} onChange={(e) => setForm((f) => ({ ...f, outputFormat: e.target.value }))} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">制限時間 (ms)</label>
            <input type="number" className="input-field" value={form.timeLimitMs} onChange={(e) => setForm((f) => ({ ...f, timeLimitMs: Number(e.target.value) }))} min={100} />
          </div>
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">言語 (カンマ区切り)</label>
            <input className="input-field" value={form.allowedLanguages} onChange={(e) => setForm((f) => ({ ...f, allowedLanguages: e.target.value }))} placeholder="cpp,python" />
          </div>
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">TC バージョン</label>
            <input className="input-field" value={form.testcaseVersion} onChange={(e) => setForm((f) => ({ ...f, testcaseVersion: e.target.value }))} placeholder="v1" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isPublished" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="accent-rp-400" />
        <label htmlFor="isPublished" className="text-sm text-rp-100">公開する</label>
      </div>
      {error && <p className="text-sm text-rp-accent">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存"}</button>
        <button type="button" onClick={onCancel} className="btn-ghost">キャンセル</button>
      </div>
    </form>
  );
}

export default function CreatorPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editProblem, setEditProblem] = useState<Problem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) { router.push("/login"); return; }
    if (!loading && session?.role !== "admin" && session?.role !== "creator") { router.push("/"); return; }
  }, [session, loading, router]);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json() as Promise<{ events: Event[] }>)
      .then((d) => {
        setEvents(d.events ?? []);
        if (d.events?.[0]) setSelectedEvent(d.events[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    fetch(`/api/events/${selectedEvent}/problems`)
      .then((r) => r.json() as Promise<{ problems: Problem[] }>)
      .then((d) => setProblems(d.problems ?? []))
      .catch(() => setProblems([]));
  }, [selectedEvent]);

  async function deleteProblem(problemId: string) {
    await fetch(`/api/events/${selectedEvent}/problems/${problemId}`, { method: "DELETE" });
    setProblems((ps) => ps.filter((p) => p.id !== problemId));
    setDeleteConfirm(null);
  }

  const myProblems = session?.role === "admin"
    ? problems
    : problems.filter((p) => p.creatorUid === (session as { uid: string } | undefined)?.uid);

  if (loading) return null;

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-rp-100">Creator</h1>
            <p className="text-sm text-rp-muted mt-1">問題の作成・編集・削除</p>
          </div>

          {/* Event selector */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-sm text-rp-muted">イベント:</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="input-field w-auto max-w-xs"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.id}</option>
              ))}
            </select>
          </div>

          {/* Form */}
          {showForm && selectedEvent && (
            <div className="card-surface p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-rp-100 mb-4">新規問題作成</h2>
              <ProblemForm
                eventId={selectedEvent}
                onSave={() => {
                  setShowForm(false);
                  fetch(`/api/events/${selectedEvent}/problems`)
                    .then((r) => r.json() as Promise<{ problems: Problem[] }>)
                    .then((d) => setProblems(d.problems ?? []))
                    .catch(() => {});
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {editProblem && (
            <div className="card-surface p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-rp-100 mb-4">問題を編集: {editProblem.id}</h2>
              <ProblemForm
                eventId={selectedEvent}
                initial={editProblem}
                onSave={() => {
                  setEditProblem(null);
                  fetch(`/api/events/${selectedEvent}/problems`)
                    .then((r) => r.json() as Promise<{ problems: Problem[] }>)
                    .then((d) => setProblems(d.problems ?? []))
                    .catch(() => {});
                }}
                onCancel={() => setEditProblem(null)}
              />
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-rp-100">
              {session?.role === "admin" ? "全問題" : "自分の問題"} ({myProblems.length})
            </h2>
            {!showForm && !editProblem && (
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
                + 新規問題
              </button>
            )}
          </div>

          {myProblems.length === 0 ? (
            <div className="card-surface p-12 text-center">
              <p className="text-rp-muted mb-4">問題がありません</p>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
                最初の問題を作成
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myProblems.map((p) => (
                <div key={p.id} className="card-surface flex items-center gap-4 px-5 py-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rp-700 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-rp-300">{p.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-rp-100 truncate">{p.title}</span>
                      {!p.isPublished && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rp-muted/30 text-rp-muted">DRAFT</span>
                      )}
                      {p.isPublished && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded badge-active">LIVE</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-rp-muted mt-0.5">
                      更新: {new Date(p.updatedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${selectedEvent}/problems/${p.id}`}
                      className="btn-ghost py-1.5 px-3 text-xs"
                    >
                      表示
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditProblem(p)}
                      className="btn-ghost py-1.5 px-3 text-xs"
                    >
                      編集
                    </button>
                    {deleteConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => deleteProblem(p.id)}
                          className="text-xs px-3 py-1.5 rounded bg-rp-accent text-white hover:opacity-90 transition-opacity"
                        >
                          削除確認
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="btn-ghost py-1.5 px-2 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(p.id)}
                        className="btn-ghost py-1.5 px-3 text-xs text-rp-accent border-rp-accent/30 hover:bg-rp-accent/10"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
