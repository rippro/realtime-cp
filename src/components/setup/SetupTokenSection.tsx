"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { SetupCodeBlock } from "./SetupCodeBlock";

interface Props {
  eventId: string;
  isSolver: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-rp-border text-rp-muted transition-colors hover:border-rp-500 hover:text-rp-100"
      aria-label="コピー"
    >
      {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
    </button>
  );
}

export function SetupTokenSection({ eventId, isSolver }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!isSolver) {
      setFetched(true);
      return;
    }
    fetch(`/api/events/${encodeURIComponent(eventId)}/token`)
      .then((r) => r.json() as Promise<{ token: string | null; teamName: string | null }>)
      .then((d) => {
        setToken(d.token);
        setTeamName(d.teamName);
      })
      .catch(() => {})
      .finally(() => setFetched(true));
  }, [eventId, isSolver]);

  const configJson = JSON.stringify({ eventId, token: token ?? "rj_live_XXXX..." }, null, 2);

  return (
    <div className="space-y-8">
      {/* token */}
      <section>
        <h2 className="text-sm font-semibold text-rp-100 mb-2">トークン</h2>
        {!isSolver ? (
          <p className="text-sm text-rp-muted">
            対象チームの CLI Tokens からトークンを発行してください。
          </p>
        ) : !fetched ? (
          <div className="h-10 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-rp-400 border-t-transparent" />
          </div>
        ) : token ? (
          <div className="space-y-1.5">
            {teamName && (
              <p className="text-xs text-rp-muted">
                チーム: <span className="text-rp-100">{teamName}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-rp-800 border border-rp-border px-4 py-3 text-sm font-mono text-rp-300 overflow-x-auto">
                {token}
              </code>
              <CopyButton text={token} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-rp-muted">
            このイベントのチームに参加するとトークンが表示されます。
          </p>
        )}
      </section>

      {/* .rippro-judge.json */}
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
