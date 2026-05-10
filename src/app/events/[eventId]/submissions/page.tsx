"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Submission {
  id: string;
  userId: string;
  teamId: string;
  problemId: string;
  status: string;
  maxTimeMs: number;
  createdAt: string;
}

export default function SubmissionsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${eventId}/submissions`)
      .then((r) => {
        if (r.status === 401) throw new Error("ログインが必要です");
        return r.json() as Promise<{ submissions: Submission[] }>;
      })
      .then((d) => setSubmissions(d.submissions ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rp-100">Submissions</h1>
        <p className="text-sm text-rp-muted mt-0.5">AC 提出一覧</p>
      </div>

      {loading ? (
        <div className="card-surface p-16 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card-surface p-8 text-center">
          <p className="text-rp-muted">{error}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card-surface p-16 text-center">
          <p className="text-rp-muted">まだ提出がありません</p>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border">
                {["#", "User", "Problem", "Time", "Submitted"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-mono text-rp-muted font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-border/50">
              {submissions.map((s, i) => (
                <tr key={s.id} className="hover:bg-rp-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rp-500">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-rp-100">{s.userId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-rp-300">{s.problemId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-rp-muted">{s.maxTimeMs}ms</td>
                  <td className="px-4 py-3 font-mono text-xs text-rp-muted">
                    {new Date(s.createdAt).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
