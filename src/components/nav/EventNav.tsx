"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

interface EventNavProps {
  eventId: string;
}

const tabs = [
  { key: "home", label: "Overview", href: (id: string) => `/events/${id}` },
  { key: "problems", label: "Problems", href: (id: string) => `/events/${id}/problems` },
  { key: "submissions", label: "Submissions", href: (id: string) => `/events/${id}/submissions` },
  { key: "teams", label: "Teams", href: (id: string) => `/events/${id}/teams` },
  { key: "settings", label: "Settings", href: (id: string) => `/events/${id}/settings` },
  { key: "setup", label: "Setup", href: (id: string) => `/events/${id}/setup` },
];

export function EventNav({ eventId }: EventNavProps) {
  const segment = useSelectedLayoutSegment();
  const activeKey = tabs.some((tab) => tab.key === segment) ? segment : "home";

  return (
    <div className="border-b border-rp-border bg-rp-900 sticky top-14 z-40">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end h-11 gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeKey === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href(eventId)}
                className={`relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? "text-rp-highlight font-medium border-rp-highlight"
                    : "text-rp-muted hover:text-rp-300 border-transparent"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
