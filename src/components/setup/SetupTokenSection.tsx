"use client";

import { useEffect, useState } from "react";
import { SetupCodeBlock } from "./SetupCodeBlock";

interface Props {
  eventId: string;
  isSolver: boolean;
}



export function SetupTokenSection({ eventId, isSolver }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [, setFetched] = useState(false);

  useEffect(() => {
    if (!isSolver) {
      setFetched(true);
      return;
    }
    fetch(`/api/events/${encodeURIComponent(eventId)}/token`)
      .then((r) => r.json() as Promise<{ token: string | null; teamName: string | null }>)
      .then((d) => {
        setToken(d.token);
      })
      .catch(() => {})
      .finally(() => setFetched(true));
  }, [eventId, isSolver]);

  const configJson = JSON.stringify({ eventId, token: token ?? "rj_live_XXXX..." }, null, 2);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-rp-100 mb-2">
          3. 設定ファイル (.rippro-judge.json)
        </h2>
        <p className="text-sm text-rp-muted mb-2">提出作業ディレクトリに配置。</p>
        <SetupCodeBlock code={configJson} />
      </section>
    </div>
  );
}
