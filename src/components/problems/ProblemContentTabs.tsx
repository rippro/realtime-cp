"use client";

import { Code2, FileText } from "lucide-react";
import { useState } from "react";
import { MarkdownView } from "@/components/problems/MarkdownView";

export function ProblemContentTabs({
  statement,
  solutionCode,
  showSolution,
}: {
  statement: string;
  solutionCode: string;
  showSolution: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"statement" | "solution">("statement");
  const canShowSolution = showSolution && solutionCode.trim().length > 0;

  return (
    <div>
      {canShowSolution && (
        <div className="mb-6 inline-flex rounded-md border border-rp-border bg-rp-900 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            className={`inline-flex h-9 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors ${
              activeTab === "statement"
                ? "bg-rp-700 text-rp-100"
                : "text-rp-muted hover:text-rp-100"
            }`}
          >
            <FileText aria-hidden="true" size={14} />
            問題文
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("solution")}
            className={`inline-flex h-9 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors ${
              activeTab === "solution" ? "bg-rp-700 text-rp-100" : "text-rp-muted hover:text-rp-100"
            }`}
          >
            <Code2 aria-hidden="true" size={14} />
            解答例
          </button>
        </div>
      )}

      {activeTab === "solution" && canShowSolution ? (
        <MarkdownView source={`\`\`\`cpp\n${solutionCode}\n\`\`\``} />
      ) : (
        <MarkdownView source={statement} />
      )}
    </div>
  );
}
