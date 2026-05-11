"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  where,
} from "firebase/firestore";
import { ArrowRight, ArrowUpDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClientFirestore } from "@/lib/auth/firebase-client";

interface Problem {
  id: string;
  title: string;
  isPublished: boolean;
  timeLimitMs: number;
  points: number;
  updatedAt: string;
}

interface Solve {
  teamId: string;
  problemId: string;
}

interface Team {
  id: string;
  eventId: string;
}

interface TeamMember {
  teamId: string;
  userId: string;
}

type SortMode = "id" | "pointsAsc" | "pointsDesc";
type EventStatus = "waiting" | "live" | "ended";

function normalizeEventStatus(value: unknown, isActive: boolean): EventStatus {
  if (value === "waiting" || value === "live" || value === "ended") return value;
  return isActive ? "live" : "waiting";
}

function timestampToIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

export function RealtimeProblemsList({
  eventId,
  solverUserId,
}: {
  eventId: string;
  solverUserId: string | null;
}) {
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<TeamMember[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("id");
  const [error, setError] = useState("");

  useEffect(() => {
    const db = getClientFirestore();
    const unsubscribers = [
      onSnapshot(
        doc(db, "events", eventId),
        (snapshot) => {
          if (!snapshot.exists()) {
            setEventStatus("waiting");
            return;
          }
          const data = snapshot.data();
          setEventStatus(normalizeEventStatus(data.status, Boolean(data.isActive)));
        },
        (err) => setError(err.message),
      ),
      onSnapshot(
        query(
          collection(db, "problems"),
          where("eventId", "==", eventId),
          where("isPublished", "==", true),
          orderBy("id", "asc"),
        ),
        (snapshot) => {
          setProblems(
            snapshot.docs.map((problemDoc) => {
              const d = problemDoc.data();
              return {
                id: String(d.id ?? problemDoc.id),
                title: String(d.title ?? ""),
                isPublished: Boolean(d.isPublished),
                timeLimitMs: Number(d.timeLimitMs ?? 0),
                points: Number(d.points ?? 100),
                updatedAt: timestampToIso(d.updatedAt),
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

  useEffect(() => {
    if (!solverUserId) {
      setTeams([]);
      setMemberships([]);
      return;
    }

    const db = getClientFirestore();
    const unsubscribeTeams = onSnapshot(
      query(collection(db, "teams"), where("eventId", "==", eventId)),
      (snapshot) => {
        setTeams(
          snapshot.docs.map((teamDoc) => {
            const d = teamDoc.data();
            return { id: teamDoc.id, eventId: String(d.eventId ?? "") };
          }),
        );
      },
      (err) => setError(err.message),
    );
    const unsubscribeMemberships = onSnapshot(
      query(collection(db, "teamMembers"), where("userId", "==", solverUserId)),
      (snapshot) => {
        setMemberships(
          snapshot.docs.map((memberDoc) => {
            const d = memberDoc.data();
            return {
              teamId: String(d.teamId ?? ""),
              userId: String(d.userId ?? ""),
            };
          }),
        );
      },
      (err) => setError(err.message),
    );

    return () => {
      unsubscribeTeams();
      unsubscribeMemberships();
    };
  }, [eventId, solverUserId]);

  const solveCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const solve of solves) {
      counts.set(solve.problemId, (counts.get(solve.problemId) ?? 0) + 1);
    }
    return counts;
  }, [solves]);

  const mySolvedIds = useMemo(() => {
    if (!solverUserId) return new Set<string>();

    const eventTeamIds = new Set(teams.map((team) => team.id));
    const myTeamId = memberships.find((membership) => eventTeamIds.has(membership.teamId))?.teamId;
    if (!myTeamId) return new Set<string>();

    return new Set(
      solves.filter((solve) => solve.teamId === myTeamId).map((solve) => solve.problemId),
    );
  }, [memberships, solverUserId, solves, teams]);

  const sortedProblems = useMemo(() => {
    return [...problems].sort((a, b) => {
      if (sortMode === "pointsAsc") return a.points - b.points || a.id.localeCompare(b.id);
      if (sortMode === "pointsDesc") return b.points - a.points || a.id.localeCompare(b.id);
      return a.id.localeCompare(b.id);
    });
  }, [problems, sortMode]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rp-muted text-sm">{error}</p>
      </div>
    );
  }

  if (eventStatus === null) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
      </div>
    );
  }

  if (eventStatus === "waiting") {
    return (
      <div className="py-20 text-center">
        <p className="text-rp-muted text-sm">待機中</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-rp-muted text-sm">問題はまだ公開されていません</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-rp-border bg-rp-900 p-0.5">
          {[
            { mode: "id" as const, label: "ID" },
            { mode: "pointsAsc" as const, label: "Pt 昇順" },
            { mode: "pointsDesc" as const, label: "Pt 降順" },
          ].map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => setSortMode(option.mode)}
              className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors ${
                sortMode === option.mode
                  ? "bg-rp-700 text-rp-100"
                  : "text-rp-muted hover:text-rp-100"
              }`}
            >
              {option.mode !== "id" && <ArrowUpDown aria-hidden="true" size={13} />}
              {option.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-rp-muted">{problems.length} 問</div>
      </div>
      <div className="hidden sm:grid grid-cols-[48px_1fr_80px_80px_80px] gap-4 px-4 pb-2 text-[11px] font-medium text-rp-muted uppercase tracking-wider">
        <span>#</span>
        <span>問題名</span>
        <span>条件</span>
        <span className="text-right">Pt</span>
        <span className="text-right">AC</span>
      </div>
      <div className="divide-y divide-rp-border border-t border-rp-border">
        {sortedProblems.map((problem) => {
          const solved = mySolvedIds.has(problem.id);
          return (
            <Link
              key={problem.id}
              href={`/events/${eventId}/problems/${problem.id}`}
              className={`group -mx-4 flex items-center gap-4 border-l-4 px-4 py-4 transition-colors ${
                solved
                  ? "border-l-rp-success bg-[var(--rp-success-surface)] shadow-[inset_0_0_0_1px_var(--rp-success-border)] hover:bg-[var(--rp-success-surface-hover)]"
                  : "border-l-transparent hover:bg-rp-800"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 text-center font-mono text-sm font-bold ${
                  solved ? "text-rp-success" : "text-rp-highlight"
                }`}
              >
                {problem.id}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <h2
                  className={`text-sm font-medium truncate transition-colors ${
                    solved
                      ? "text-rp-success group-hover:text-rp-success/80"
                      : "text-rp-100 group-hover:text-rp-400"
                  }`}
                >
                  {problem.title}
                </h2>
                {solved && (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded bg-rp-success px-2 py-0.5 text-[11px] font-bold leading-4 text-white dark:text-rp-900">
                    <CheckCircle2 aria-hidden="true" size={13} />
                    <span>AC</span>
                  </span>
                )}
              </div>
              <div
                className={`hidden sm:block w-20 text-xs font-mono flex-shrink-0 ${
                  solved ? "text-rp-success/60" : "text-rp-muted"
                }`}
              >
                {problem.timeLimitMs}ms
              </div>
              <div className="hidden sm:block w-16 text-right flex-shrink-0">
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${
                    solved ? "text-rp-success" : "text-rp-highlight"
                  }`}
                >
                  {problem.points}
                </span>
                <span className="text-[10px] text-rp-muted ml-0.5">pt</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="w-10 text-right text-base font-bold text-rp-success font-mono tabular-nums">
                  {solveCount.get(problem.id) ?? 0}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  size={14}
                  className={`transition-colors ${
                    solved
                      ? "text-rp-success/50 group-hover:text-rp-success"
                      : "text-rp-600 group-hover:text-rp-400"
                  }`}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
