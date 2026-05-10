"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlobalNav } from "@/components/nav/GlobalNav";
import { useAuth } from "@/contexts/AuthContext";

interface Problem {
  eventId: string;
  id: string;
  title: string;
  statement: string;
  solutionCode: string;
  timeLimitMs: number;
  testcases: Testcase[];
  isPublished: boolean;
  creatorUid: string | null;
  updatedAt: string;
}

interface Testcase {
  id?: string;
  clientId: string;
  type: "sample" | "hidden";
  input: string;
  expectedOutput: string;
  orderIndex?: number;
}

interface Event {
  id: string;
  isActive: boolean;
}

function makeClientId() {
  return crypto.randomUUID();
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
    title: initial?.title ?? "",
    statement: initial?.statement ?? "",
    solutionCode: initial?.solutionCode ?? "",
    timeLimitMs: initial?.timeLimitMs ?? 2000,
    isPublished: initial?.isPublished ?? false,
  });
  const [testcases, setTestcases] = useState<Testcase[]>(
    initial?.testcases?.length
      ? initial.testcases.map((testcase) => ({
          ...testcase,
          clientId: testcase.id ?? makeClientId(),
        }))
      : [{ clientId: makeClientId(), type: "sample", input: "", expectedOutput: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(initial?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = isEdit
        ? `/api/events/${eventId}/problems/${initial?.id}`
        : `/api/events/${eventId}/problems`;
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        ...form,
        testcases,
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

  function updateTestcase(index: number, updates: Partial<Testcase>) {
    setTestcases((cases) =>
      cases.map((testcase, i) => (i === index ? { ...testcase, ...updates } : testcase)),
    );
  }

  function addTestcase(type: "sample" | "hidden") {
    setTestcases((cases) => [
      ...cases,
      { clientId: makeClientId(), type, input: "", expectedOutput: "" },
    ]);
  }

  function removeTestcase(index: number) {
    setTestcases((cases) => cases.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="problem-title" className="block text-xs text-rp-muted mb-1.5">
          タイトル
        </label>
        <input
          id="problem-title"
          className="input-field"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="A + B 問題"
          required
        />
      </div>
      <div>
        <label htmlFor="problem-statement" className="block text-xs text-rp-muted mb-1.5">
          問題文 Markdown
        </label>
        <textarea
          id="problem-statement"
          className="input-field min-h-[220px] resize-y font-mono"
          value={form.statement}
          onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
          placeholder={"# 問題文\n\n$1 \\le N \\le 10^5$"}
          required
        />
      </div>
      <div>
        <label htmlFor="solution-code" className="block text-xs text-rp-muted mb-1.5">
          模範解答コード
        </label>
        <textarea
          id="solution-code"
          className="input-field min-h-[180px] resize-y font-mono"
          value={form.solutionCode}
          onChange={(e) => setForm((f) => ({ ...f, solutionCode: e.target.value }))}
          placeholder={
            "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  return 0;\n}"
          }
        />
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="block text-xs text-rp-muted">テストケース</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addTestcase("sample")}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              サンプル追加
            </button>
            <button
              type="button"
              onClick={() => addTestcase("hidden")}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              隠し追加
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {testcases.map((testcase, index) => (
            <div
              key={testcase.clientId}
              className="rounded-lg border border-rp-border bg-rp-800 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <select
                  value={testcase.type}
                  onChange={(e) =>
                    updateTestcase(index, {
                      type: e.target.value === "hidden" ? "hidden" : "sample",
                    })
                  }
                  className="input-field w-36 bg-rp-900"
                >
                  <option value="sample">sample</option>
                  <option value="hidden">hidden</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeTestcase(index)}
                  className="btn-ghost py-1.5 px-3 text-xs"
                  disabled={testcases.length === 1}
                >
                  削除
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-rp-muted">
                    Input
                  </p>
                  <textarea
                    aria-label={`Testcase ${index + 1} input`}
                    className="input-field min-h-[120px] resize-y font-mono"
                    value={testcase.input}
                    onChange={(e) => updateTestcase(index, { input: e.target.value })}
                  />
                </div>
                <div>
                  <p className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-rp-muted">
                    Expected Output
                  </p>
                  <textarea
                    aria-label={`Testcase ${index + 1} expected output`}
                    className="input-field min-h-[120px] resize-y font-mono"
                    value={testcase.expectedOutput}
                    onChange={(e) => updateTestcase(index, { expectedOutput: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="time-limit-ms" className="block text-xs text-rp-muted mb-1.5">
            制限時間 (ms)
          </label>
          <input
            id="time-limit-ms"
            type="number"
            className="input-field"
            value={form.timeLimitMs}
            onChange={(e) => setForm((f) => ({ ...f, timeLimitMs: Number(e.target.value) }))}
            min={100}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          checked={form.isPublished}
          onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
          className="accent-rp-400"
        />
        <label htmlFor="isPublished" className="text-sm text-rp-100">
          公開する
        </label>
      </div>
      {error && <p className="text-sm text-rp-accent">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          キャンセル
        </button>
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
    if (!loading && !session) {
      router.push("/login");
      return;
    }
    if (!loading && session?.role !== "admin" && session?.role !== "creator") {
      router.push("/");
      return;
    }
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
      .then(async (r) => {
        const d = (await r.json()) as {
          problems?: Problem[];
          error?: string;
          detail?: string;
        };
        if (!r.ok) {
          throw new Error(d.detail ?? d.error ?? "問題の取得に失敗しました");
        }
        return d;
      })
      .then((d) => setProblems(d.problems ?? []))
      .catch((error: unknown) => {
        console.error("Failed to load creator problems", error);
        setProblems([]);
      });
  }, [selectedEvent]);

  async function deleteProblem(problemId: string) {
    await fetch(`/api/events/${selectedEvent}/problems/${problemId}`, { method: "DELETE" });
    setProblems((ps) => ps.filter((p) => p.id !== problemId));
    setDeleteConfirm(null);
  }

  async function openEdit(problemId: string) {
    const res = await fetch(`/api/events/${selectedEvent}/problems/${problemId}`);
    if (!res.ok) return;
    const problem = (await res.json()) as Problem;
    setEditProblem(problem);
    setShowForm(false);
  }

  const myProblems =
    session?.role === "admin"
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
            <label htmlFor="event-selector" className="text-sm text-rp-muted">
              イベント:
            </label>
            <select
              id="event-selector"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="input-field w-auto max-w-xs"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id}
                </option>
              ))}
            </select>
          </div>

          {/* Form */}
          {showForm && selectedEvent && (
            <div className="card-surface p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-rp-100 mb-4">新規問題作成</h2>
              <ProblemForm
                key="new"
                eventId={selectedEvent}
                onSave={() => {
                  setShowForm(false);
                  fetch(`/api/events/${selectedEvent}/problems`)
                    .then((r) => r.json() as Promise<{ problems: Problem[] }>)
                    .then((d) => setProblems(d.problems ?? []))
                    .catch((error: unknown) => console.error("Failed to reload problems", error));
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {editProblem && (
            <div className="card-surface p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-rp-100 mb-4">
                問題を編集: {editProblem.id}
              </h2>
              <ProblemForm
                key={editProblem.id}
                eventId={selectedEvent}
                initial={editProblem}
                onSave={() => {
                  setEditProblem(null);
                  fetch(`/api/events/${selectedEvent}/problems`)
                    .then((r) => r.json() as Promise<{ problems: Problem[] }>)
                    .then((d) => setProblems(d.problems ?? []))
                    .catch((error: unknown) => console.error("Failed to reload problems", error));
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
                      <span className="font-display text-sm font-semibold text-rp-100 truncate">
                        {p.title}
                      </span>
                      {!p.isPublished && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rp-muted/30 text-rp-muted">
                          DRAFT
                        </span>
                      )}
                      {p.isPublished && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded badge-live">
                          LIVE
                        </span>
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
                      onClick={() => void openEdit(p.id)}
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
