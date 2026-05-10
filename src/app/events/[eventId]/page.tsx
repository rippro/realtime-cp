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

  const now = new Date();
  const ended = now > event.endsAt;
  const isLive = event.isActive && !ended;
  const statusLabel = isLive ? "LIVE" : ended ? "ENDED" : "UPCOMING";

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
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                isLive ? "badge-active" : "badge-inactive"
              }`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-rp-100 mb-3">{event.id}</h1>
            <div className="flex items-center gap-6 text-xs font-mono text-rp-muted">
              <span>
                <span className="text-rp-500 mr-1.5">開始</span>
                {event.startsAt.toLocaleDateString("ja-JP")} {event.startsAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>
                <span className="text-rp-500 mr-1.5">終了</span>
                {event.endsAt.toLocaleDateString("ja-JP")} {event.endsAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <Link href={`/events/${eventId}/problems`} className="btn-primary inline-flex items-center gap-2">
            問題を見る
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-rp-border border border-rp-border rounded-lg mb-10 overflow-hidden">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-5 bg-rp-800">
            <div className="text-3xl font-extrabold tracking-tight text-rp-highlight mb-1">
              {s.value}
              {s.total !== undefined && s.total !== s.value && (
                <span className="text-base text-rp-muted font-normal"> / {s.total}</span>
              )}
            </div>
            <div className="text-xs text-rp-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: `/events/${eventId}/problems`, label: "Problems", desc: "問題一覧と詳細" },
          { href: `/events/${eventId}/submissions`, label: "Submissions", desc: "提出履歴と AC 一覧" },
          { href: `/events/${eventId}/teams`, label: "Teams", desc: "チームランキング" },
          { href: `/events/${eventId}/setup`, label: "Setup", desc: "CLI セットアップガイド" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card-surface p-5 flex items-center justify-between group hover:border-rp-500 hover:bg-rp-800 transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-rp-100 mb-0.5 group-hover:text-rp-400 transition-colors">{link.label}</p>
              <p className="text-xs text-rp-muted">{link.desc}</p>
            </div>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-rp-600 group-hover:text-rp-400 transition-colors flex-shrink-0">
              <path d="M3.5 7.5h8M8 4l3.5 3.5L8 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
