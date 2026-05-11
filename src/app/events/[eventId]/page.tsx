import type { Timestamp } from "firebase-admin/firestore";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const revalidate = 30;

type EventStatus = "waiting" | "live" | "ended";

function normalizeEventStatus(value: unknown, isActive: boolean): EventStatus {
  if (value === "waiting" || value === "live" || value === "ended") return value;
  return isActive ? "live" : "waiting";
}

function eventStatusLabel(status: EventStatus) {
  if (status === "live") return "大会中";
  if (status === "ended") return "終了後";
  return "待機";
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

async function getEventData(eventId: string) {
  try {
    const db = getAdminFirestore();
    const [eventSnap, problemsSnap, teamsSnap, submissionsSnap, solvesSnap] = await Promise.all([
      db.collection("events").doc(eventId).get(),
      db.collection("problems").where("eventId", "==", eventId).get(),
      db.collection("teams").where("eventId", "==", eventId).get(),
      db.collection("submissions").where("eventId", "==", eventId).get(),
      db.collection("solves").where("eventId", "==", eventId).get(),
    ]);

    if (!eventSnap.exists) return null;
    const d = eventSnap.data();
    if (!d) return null;

    return {
      id: eventSnap.id,
      isActive: d.isActive as boolean,
      status: normalizeEventStatus(d.status, Boolean(d.isActive)),
      startsAt: (d.startsAt as Timestamp).toDate(),
      problemCount: problemsSnap.size,
      publishedCount: problemsSnap.docs.filter((p) => p.data().isPublished).length,
      teamCount: teamsSnap.size,
      submissionCount: submissionsSnap.size,
      solveCount: solvesSnap.size,
    };
  } catch {
    return null;
  }
}

export default async function EventHomePage({ params }: PageProps) {
  const { eventId: _rawEventId } = await params;
  const eventId = decodeURIComponent(_rawEventId);
  const event = await getEventData(eventId);

  if (!event) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-rp-muted">イベントが見つかりません: {eventId}</p>
      </div>
    );
  }

  const isLive = event.status === "live";
  const statusLabel = eventStatusLabel(event.status);

  const stats = [
    { label: "公開問題", value: event.publishedCount, total: event.problemCount },
    { label: "チーム", value: event.teamCount },
    { label: "提出数", value: event.submissionCount },
    { label: "AC 数", value: event.solveCount },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-12 pb-8 border-b border-rp-border">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  isLive ? "badge-live" : "badge-inactive"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-rp-100 mb-3">{event.id}</h1>
            <div className="flex items-center gap-6 text-xs font-mono text-rp-muted">
              <span>
                <span className="text-rp-500 mr-1.5">開始</span>
                {event.startsAt.toLocaleDateString("ja-JP")}{" "}
                {event.startsAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <Link
            href={`/events/${eventId}/problems`}
            className="btn-primary inline-flex items-center gap-2"
          >
            問題を見る
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-rp-border grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg overflow-hidden mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-rp-900 px-6 py-6">
            <div
              className="text-4xl font-extrabold tracking-tight text-rp-100 mb-1 tabular-nums"
              style={{ letterSpacing: "-0.03em" }}
            >
              {s.value}
              {s.total !== undefined && s.total !== s.value && (
                <span className="text-xl text-rp-muted font-normal"> / {s.total}</span>
              )}
            </div>
            <div className="text-xs text-rp-muted font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: `/events/${eventId}/problems`, label: "Problems", desc: "問題一覧と詳細" },
          {
            href: `/events/${eventId}/submissions`,
            label: "Submissions",
            desc: "提出履歴と AC 一覧",
          },
          { href: `/events/${eventId}/teams`, label: "Teams", desc: "チームランキング" },
          { href: `/events/${eventId}/setup`, label: "Setup", desc: "CLI セットアップガイド" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card-surface p-5 flex items-center justify-between group hover:border-rp-500 hover:bg-rp-800 transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-rp-100 mb-0.5 group-hover:text-rp-400 transition-colors">
                {link.label}
              </p>
              <p className="text-xs text-rp-muted">{link.desc}</p>
            </div>
            <ArrowRight
              aria-hidden="true"
              size={15}
              className="flex-shrink-0 text-rp-600 transition-colors group-hover:text-rp-400"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
