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

          <div className="mb-12 border-b border-rp-border pb-8">
            <p className="text-xs font-medium tracking-widest text-rp-muted uppercase mb-3">
              Events
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-rp-100">
              コンテスト一覧
            </h1>
          </div>

          {events.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-rp-muted text-sm">現在開催中のイベントはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-rp-border">
              {events.map((event) => {
                const start = new Date(event.startsAt);
                const end = new Date(event.endsAt);
                const now = new Date();
                const ended = now > end;
                const isLive = event.isActive && !ended;

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between py-6 group hover:bg-rp-800 -mx-4 px-4 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isLive ? "bg-rp-highlight" : "bg-rp-600"
                      }`} />
                      <div>
                        <h2 className="text-base font-semibold text-rp-100 group-hover:text-rp-400 transition-colors mb-1">
                          {event.id}
                        </h2>
                        <div className="flex items-center gap-4 text-xs text-rp-muted font-mono">
                          <span>{start.toLocaleDateString("ja-JP")} — {end.toLocaleDateString("ja-JP")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                        isLive
                          ? "badge-active"
                          : "badge-inactive"
                      }`}>
                        {isLive ? "LIVE" : ended ? "ENDED" : "UPCOMING"}
                      </span>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                        className="text-rp-600 group-hover:text-rp-400 transition-colors"
                      >
                        <path d="M4 8h8M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
