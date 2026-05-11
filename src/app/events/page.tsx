import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GlobalNav } from "@/components/nav/GlobalNav";

export const revalidate = 60;

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

async function getEvents() {
  try {
    const { getAdminFirestore } = await import("@/lib/firebase/admin");
    const db = getAdminFirestore();
    const snap = await db.collection("events").get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        isActive: d.isActive as boolean,
        status: normalizeEventStatus(d.status, Boolean(d.isActive)),
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
            <h1 className="text-3xl font-extrabold tracking-tight text-rp-100">コンテスト一覧</h1>
          </div>

          {events.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-rp-muted text-sm">現在開催中のイベントはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-rp-border">
              {events.map((event) => {
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between py-6 group hover:bg-rp-800 -mx-4 px-4 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          event.isActive ? "bg-rp-accent" : "bg-rp-600"
                        }`}
                      />
                      <h2 className="text-base font-semibold text-rp-100 group-hover:text-rp-400 transition-colors">
                        {event.id}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                          event.isActive ? "badge-live" : "badge-inactive"
                        }`}
                      >
                        {eventStatusLabel(event.status)}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        size={16}
                        className="text-rp-600 transition-colors group-hover:text-rp-400"
                      />
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
