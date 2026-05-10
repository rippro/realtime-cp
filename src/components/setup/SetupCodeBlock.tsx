"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function SetupCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="markdown-code-block">
      <button
        type="button"
        className="markdown-code-copy"
        onClick={copyCode}
        aria-label="コードをコピー"
      >
        {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
      </button>
      <pre className="rounded-lg bg-rp-800 border border-rp-border p-4 text-sm font-mono text-rp-300 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}
