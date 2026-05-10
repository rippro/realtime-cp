import Link from "next/link";
import { GlobalNav } from "@/components/nav/GlobalNav";

async function getEvents() {
  try {
    const { getAdminFirestore } = await import("@/lib/firebase/admin");
    const { Timestamp } = await import("firebase-admin/firestore");
    const db = getAdminFirestore();
    const snap = await db.collection("events").orderBy("startsAt", "desc").get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        isActive: d.isActive as boolean,
        startsAt: (d.startsAt as InstanceType<typeof Timestamp>).toDate().toISOString(),
        endsAt: (d.endsAt as InstanceType<typeof Timestamp>).toDate().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-rp-900 pt-14">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-rp-100">Events</h1>
            <p className="mt-1 text-sm text-rp-muted">開催中・過去のコンテストイベント</p>
          </div>

          {events.length === 0 ? (
            <div className="card-surface p-16 text-center">
              <p className="text-rp-muted">現在開催中のイベントはありません</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const start = new Date(event.startsAt);
                const end = new Date(event.endsAt);
                const now = new Date();
                const ended = now > end;

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="card-surface p-6 hover:border-rp-500 transition-all group hover:translate-y-[-2px]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="font-mono text-xs text-rp-muted">{event.id}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        event.isActive && !ended
                          ? "badge-active"
                          : "badge-inactive"
                      }`}>
                        {event.isActive && !ended ? "LIVE" : ended ? "ENDED" : "UPCOMING"}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-rp-100 mb-3 group-hover:text-rp-300 transition-colors">
                      {event.id}
                    </h2>
                    <div className="space-y-1 text-xs text-rp-muted font-mono">
                      <div className="flex gap-2">
                        <span className="text-rp-500">START</span>
                        <span>{start.toLocaleDateString("ja-JP")}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-rp-500">END</span>
                        <span>{end.toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-rp-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>詳細を見る</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
