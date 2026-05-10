"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Team {
  id: string;
  name: string;
  solveCount: number;
  createdAt: string;
}

export default function TeamsPage() {
  const { eventId } = useParams<{ eventId: string }>();
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rp-100">Teams</h1>
        <p className="text-sm text-rp-muted mt-0.5">チームランキング</p>
      </div>

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
