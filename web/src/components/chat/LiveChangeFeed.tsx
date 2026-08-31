import React from "react";

export interface CopilotAction {
  type: string;
  id?: number;
  title?: string;
  text?: string;
  translation?: string;
  subtitle?: string;
  [key: string]: unknown;
}

interface LiveChangeFeedProps {
  tokens: string[];
  actions: CopilotAction[];
}

function actionLabel(action: CopilotAction): string {
  switch (action.type) {
    case "set_title":
      return `Set title: "${action.title || ""}"`;
    case "update_subtitle":
      return `Update subtitle #${action.id}: "${action.text || ""}"`;
    case "set_hook":
      return `Set hook: "${action.title || ""}"`;
    default:
      return `${action.type}`;
  }
}

export default function LiveChangeFeed({ tokens, actions }: LiveChangeFeedProps) {
  return (
    <div className="flex flex-col gap-1 text-xs font-mono" role="log" aria-label="Live change feed">
      {tokens.map((token, i) => (
        <span key={`t-${i}`} className="text-zinc-400">
          {token}
        </span>
      ))}
      {actions.length > 0 && (
        <div className="mt-1 border-t border-zinc-700 pt-1">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Proposed changes</span>
          {actions.map((action, i) => (
            <div key={`a-${i}`} className="flex items-center gap-1 mt-0.5 text-emerald-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{actionLabel(action)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
