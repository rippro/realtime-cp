"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";

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
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  function getActiveTab() {
    const base = `/events/${eventId}`;
    if (pathname === base) return "home";
    if (pathname.startsWith(`${base}/problems`)) return "problems";
    if (pathname.startsWith(`${base}/submissions`)) return "submissions";
    if (pathname.startsWith(`${base}/teams`)) return "teams";
    if (pathname.startsWith(`${base}/settings`)) return "settings";
    if (pathname.startsWith(`${base}/setup`)) return "setup";
    return "home";
  }

  const activeKey = getActiveTab();

  useEffect(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll("[data-tab]");
    gsap.fromTo(
      items,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out", delay: 0.1 },
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current || !indicatorRef.current) return;
    const activeEl = containerRef.current.querySelector(`[data-tab="${activeKey}"]`) as HTMLElement;
    if (!activeEl) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();

    gsap.to(indicatorRef.current, {
      x: elRect.left - containerRect.left,
      width: elRect.width,
      duration: 0.3,
      ease: "power2.inOut",
    });
  }, [activeKey]);

  return (
    <div className="border-b border-rp-border bg-rp-800/60 backdrop-blur-sm sticky top-14 z-40">
      <div className="mx-auto max-w-7xl px-6">
        <div ref={containerRef} className="relative flex items-end gap-1 h-11">
          {tabs.map((tab) => {
            const isActive = activeKey === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href(eventId)}
                data-tab={tab.key}
                className={`relative px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? "text-rp-100" : "text-rp-muted hover:text-rp-100"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-0.5 bg-rp-400 rounded-t-full"
            style={{ width: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
