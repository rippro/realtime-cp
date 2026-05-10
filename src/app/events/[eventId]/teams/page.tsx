"use client";

import { collection, onSnapshot, query, type Timestamp, where } from "firebase/firestore";
import { Check, Copy, Plus, TriangleAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getClientFirestore } from "@/lib/auth/firebase-client";

interface Team {
  id: string;
  name: string;
  solveCount: number;
  totalPoints: number;
  createdAt: string;
}

interface ProblemPoints {
  id: string;
  points: number;
}

interface Solve {
  teamId: string;
  problemId: string;
}

function timestampToIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date(0).toISOString();
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
      if (!res.ok) {
        setError(d.error ?? "作成失敗");
        return;
      }
      setInviteCode(d.inviteCode ?? null);
      onCreated({ id: d.id, name: d.name, solveCount: 0, totalPoints: 0, createdAt: d.createdAt });
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
          <p className="text-sm text-rp-muted">
            チームを作成しました。招待コードをメンバーに共有してください。
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-rp-800 border border-rp-border px-4 py-3 text-sm font-mono text-rp-300 overflow-x-auto">
              {inviteCode}
            </code>
            <button
              type="button"
              onClick={() => copy(inviteCode)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-rp-border text-rp-muted transition-colors hover:border-rp-500 hover:text-rp-100"
              aria-label="コピー"
            >
              {copied ? (
                <Check aria-hidden="true" size={14} />
              ) : (
                <Copy aria-hidden="true" size={14} />
              )}
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-rp-warning">
            <TriangleAlert aria-hidden="true" size={14} />
            この招待コードはこの画面にしか表示されません。
          </p>
          <button
            type="button"
            onClick={() => setInviteCode(null)}
            className="btn-ghost inline-flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <Plus aria-hidden="true" size={14} />
            別のチームを作成
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="team-name" className="block text-xs text-rp-muted mb-1">
              チーム名
            </label>
            <input
              id="team-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="input-field w-full text-sm"
            />
          </div>
          {error && <p className="text-xs text-rp-accent">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-1.5 py-2 px-4 text-sm disabled:opacity-50"
          >
            <Plus aria-hidden="true" size={14} />
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
  const [problemPoints, setProblemPoints] = useState<ProblemPoints[]>([]);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const db = getClientFirestore();
    setLoading(true);

    const unsubscribers = [
      onSnapshot(
        query(collection(db, "teams"), where("eventId", "==", eventId)),
        (snapshot) => {
          setTeams(
            snapshot.docs.map((teamDoc) => {
              const d = teamDoc.data();
              return {
                id: teamDoc.id,
                name: String(d.name ?? ""),
                solveCount: 0,
                totalPoints: 0,
                createdAt: timestampToIso(d.createdAt),
              };
            }),
          );
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      ),
      onSnapshot(
        query(collection(db, "problems"), where("eventId", "==", eventId)),
        (snapshot) => {
          setProblemPoints(
            snapshot.docs.map((problemDoc) => {
              const d = problemDoc.data();
              return {
                id: String(d.id ?? problemDoc.id),
                points: Number(d.points ?? 100),
              };
            }),
          );
        },
        (err) => setError(err.message),
      ),
      onSnapshot(
        query(collection(db, "solves"), where("eventId", "==", eventId)),
        (snapshot) => {
          setSolves(
            snapshot.docs.map((solveDoc) => {
              const d = solveDoc.data();
              return {
                teamId: String(d.teamId ?? ""),
                problemId: String(d.problemId ?? ""),
              };
            }),
          );
        },
        (err) => setError(err.message),
      ),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [eventId]);

  const rankedTeams = useMemo(() => {
    const pointsByProblem = new Map(
      problemPoints.map((problem) => [problem.id, problem.points] as const),
    );
    const solvesByTeam = new Map<string, { count: number; points: number }>();

    for (const solve of solves) {
      const prev = solvesByTeam.get(solve.teamId) ?? { count: 0, points: 0 };
      solvesByTeam.set(solve.teamId, {
        count: prev.count + 1,
        points: prev.points + (pointsByProblem.get(solve.problemId) ?? 100),
      });
    }

    return teams
      .map((team) => {
        const score = solvesByTeam.get(team.id) ?? { count: 0, points: 0 };
        return { ...team, solveCount: score.count, totalPoints: score.points };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  }, [problemPoints, solves, teams]);

  const isSolver = !authLoading && session?.role === "solver";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rp-100">Teams</h1>
        <p className="text-sm text-rp-muted mt-0.5">チームランキング</p>
      </div>

      {isSolver && (
        <CreateTeamForm eventId={eventId} onCreated={(t) => setTeams((ts) => [t, ...ts])} />
      )}

      {loading ? (
        <div className="card-surface p-16 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card-surface p-8 text-center">
          <p className="text-rp-muted">{error}</p>
        </div>
      ) : rankedTeams.length === 0 ? (
        <div className="card-surface p-16 text-center">
          <p className="text-rp-muted">チームはまだ登録されていません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rankedTeams.map((team, i) => (
            <div key={team.id} className="card-surface flex items-center gap-4 px-5 py-4">
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold ${
                  i === 0
                    ? "bg-rp-warning/20 text-rp-warning border border-rp-warning/30"
                    : i === 1
                      ? "bg-rp-muted/20 text-rp-muted border border-rp-muted/30"
                      : i === 2
                        ? "bg-rp-accent/20 text-rp-accent border border-rp-accent/30"
                        : "bg-rp-700 text-rp-muted"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-semibold text-rp-100 truncate">
                  {team.name}
                </p>
                <p className="font-mono text-xs text-rp-muted">{team.id.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-rp-highlight tabular-nums">
                  {team.totalPoints}
                  <span className="text-sm font-normal text-rp-muted ml-1">pt</span>
                </div>
                <div className="text-[10px] text-rp-muted">{team.solveCount} SOLVES</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
