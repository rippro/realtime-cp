"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface EventData {
  id: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

export default function SettingsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { session } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json() as Promise<EventData>)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function save() {
    if (!event) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          isActive: event.isActive,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
        }),
      });
      if (!res.ok) throw new Error("保存失敗");
      setMsg("保存しました");
    } catch {
      setMsg("エラー: 保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = session?.role === "admin";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-rp-100 mb-6">Settings</h1>

      {loading ? (
        <div className="card-surface p-8 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
        </div>
      ) : !event ? (
        <div className="card-surface p-8 text-center"><p className="text-rp-muted">イベントが見つかりません</p></div>
      ) : (
        <div className="card-surface p-6 space-y-5">
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">Event ID</label>
            <input className="input-field opacity-60 cursor-not-allowed" value={event.id} readOnly />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rp-100 font-medium">Active</p>
              <p className="text-xs text-rp-muted">参加者に公開中</p>
            </div>
            <button
              type="button"
              onClick={() => canEdit && setEvent((e) => e ? { ...e, isActive: !e.isActive } : e)}
              disabled={!canEdit}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                event.isActive ? "bg-rp-success" : "bg-rp-600"
              } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                event.isActive ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">開始日時</label>
            <input
              type="datetime-local"
              className="input-field"
              value={event.startsAt.slice(0, 16)}
              onChange={(e) => canEdit && setEvent((ev) => ev ? { ...ev, startsAt: new Date(e.target.value).toISOString() } : ev)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-xs text-rp-muted mb-1.5">終了日時</label>
            <input
              type="datetime-local"
              className="input-field"
              value={event.endsAt.slice(0, 16)}
              onChange={(e) => canEdit && setEvent((ev) => ev ? { ...ev, endsAt: new Date(e.target.value).toISOString() } : ev)}
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={save} disabled={saving} className="btn-primary">
                {saving ? "保存中..." : "変更を保存"}
              </button>
              {msg && <p className={`text-sm ${msg.startsWith("エラー") ? "text-rp-accent" : "text-rp-success"}`}>{msg}</p>}
            </div>
          )}
          {!canEdit && (
            <p className="text-xs text-rp-muted pt-2">設定の変更は Admin のみ可能です</p>
          )}
        </div>
      )}
    </div>
  );
}
