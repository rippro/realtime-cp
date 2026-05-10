"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Team {
  id: string;
  name: string;
  solveCount: number;
  createdAt: string;
}

function CreateTeamForm({ eventId, onCreated }: { eventId: string; onCreated: (t: Team) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = (await res.json()) as Team & { inviteCode?: string; error?: string };
      if (!res.ok) { setError(d.error ?? "作成失敗"); return; }
      setInviteCode(d.inviteCode ?? null);
      onCreated({ id: d.id, name: d.name, solveCount: 0, createdAt: d.createdAt });
      setName("");
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="card-surface p-5 mb-6 space-y-4">
      <h3 className="font-display text-sm font-semibold text-rp-100">チームを作成</h3>
      {inviteCode ? (
        <div className="space-y-3">
          <p className="text-sm text-rp-muted">チームを作成しました。招待コードをメンバーに共有してください。</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-rp-800 border border-rp-border px-4 py-3 text-sm font-mono text-rp-300 overflow-x-auto">
              {inviteCode}
            </code>
            <button
              type="button"
              onClick={() => copy(inviteCode)}
              className="text-xs px-2 py-1 rounded border border-rp-border text-rp-muted hover:text-rp-100 hover:border-rp-500 transition-colors"
            >
              {copied ? "コピー済" : "コピー"}
            </button>
          </div>
          <p className="text-xs text-rp-warning">⚠ この招待コードはこの画面にしか表示されません。</p>
          <button
            type="button"
            onClick={() => setInviteCode(null)}
            className="btn-ghost text-sm py-1.5 px-3"
          >
            別のチームを作成
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-rp-muted mb-1">チーム名</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="input-field w-full text-sm"
            />
          </div>
          {error && <p className="text-xs text-rp-accent">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary py-2 px-4 text-sm disabled:opacity-50">
            {saving ? "作成中..." : "作成"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function TeamsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { session, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${eventId}/teams`)
      .then((r) => {
        if (r.status === 401) throw new Error("ログインが必要です");
        return r.json() as Promise<{ teams: Team[] }>;
      })
      .then((d) => setTeams(d.teams ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const isSolver = !authLoading && session?.role === "solver";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rp-100">Teams</h1>
        <p className="text-sm text-rp-muted mt-0.5">チームランキング</p>
      </div>

      {isSolver && (
        <CreateTeamForm
          eventId={eventId}
          onCreated={(t) => setTeams((ts) => [t, ...ts])}
        />
      )}

      {loading ? (
        <div className="card-surface p-16 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card-surface p-8 text-center"><p className="text-rp-muted">{error}</p></div>
      ) : teams.length === 0 ? (
        <div className="card-surface p-16 text-center"><p className="text-rp-muted">チームはまだ登録されていません</p></div>
      ) : (
        <div className="space-y-2">
          {teams.map((team, i) => (
            <div key={team.id} className="card-surface flex items-center gap-4 px-5 py-4">
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold ${
                i === 0 ? "bg-rp-warning/20 text-rp-warning border border-rp-warning/30" :
                i === 1 ? "bg-rp-muted/20 text-rp-muted border border-rp-muted/30" :
                i === 2 ? "bg-rp-accent/20 text-rp-accent border border-rp-accent/30" :
                "bg-rp-700 text-rp-muted"
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-semibold text-rp-100 truncate">{team.name}</p>
                <p className="font-mono text-xs text-rp-muted">{team.id.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-rp-success">{team.solveCount}</div>
                <div className="text-[10px] text-rp-muted">SOLVES</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
