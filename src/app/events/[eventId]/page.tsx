import Link from "next/link";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

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
    const d = eventSnap.data()!;

    return {
      id: eventSnap.id,
      isActive: d.isActive as boolean,
      startsAt: (d.startsAt as Timestamp).toDate(),
      endsAt: (d.endsAt as Timestamp).toDate(),
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
  const { eventId } = await params;
  const event = await getEventData(eventId);

  if (!event) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-rp-muted">イベントが見つかりません: {eventId}</p>
      </div>
    );
  }

  const now = new Date();
  const ended = now > event.endsAt;
  const statusLabel = event.isActive && !ended ? "LIVE" : ended ? "ENDED" : "UPCOMING";
  const statusClass = event.isActive && !ended ? "badge-active" : "badge-inactive";

  const stats = [
    { label: "Problems", value: event.publishedCount, total: event.problemCount, icon: "📋" },
    { label: "Teams", value: event.teamCount, icon: "👥" },
    { label: "Submissions", value: event.submissionCount, icon: "📤" },
    { label: "Solves", value: event.solveCount, icon: "✅" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <h1 className="font-display text-4xl font-extrabold text-rp-100">{event.id}</h1>
          <div className="mt-2 flex items-center gap-4 text-xs font-mono text-rp-muted">
            <span>
              <span className="text-rp-500 mr-1">START</span>
              {event.startsAt.toLocaleDateString("ja-JP")} {event.startsAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>
              <span className="text-rp-500 mr-1">END</span>
              {event.endsAt.toLocaleDateString("ja-JP")} {event.endsAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <Link
          href={`/events/${eventId}/problems`}
          className="btn-primary inline-flex items-center gap-2"
        >
          問題を見る
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="font-mono text-2xl font-bold text-rp-100">
              {s.value}
              {s.total !== undefined && s.total !== s.value && (
                <span className="text-sm text-rp-muted font-normal"> / {s.total}</span>
              )}
            </div>
            <div className="text-xs text-rp-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: `/events/${eventId}/problems`, label: "Problems", desc: "問題一覧と詳細", color: "rp-400" },
          { href: `/events/${eventId}/submissions`, label: "Submissions", desc: "提出履歴と AC 一覧", color: "rp-success" },
          { href: `/events/${eventId}/teams`, label: "Teams", desc: "チームランキング", color: "rp-warning" },
          { href: `/events/${eventId}/setup`, label: "Setup", desc: "CLI セットアップガイド", color: "rp-300" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card-surface p-5 flex items-center justify-between group hover:border-rp-500 transition-all"
          >
            <div>
              <p className={`text-sm font-display font-bold text-${link.color} mb-0.5`}>{link.label}</p>
              <p className="text-xs text-rp-muted">{link.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-rp-500 group-hover:text-rp-300 transition-colors">
              <path d="M4 8h8M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
