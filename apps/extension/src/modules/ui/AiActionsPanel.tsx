import React from "react"

import type { AiAction, AiActionResult } from "../api/backendClient"

type Props = {
  loadingAction: AiAction | null
  result: AiActionResult | null
  error: string | null
  onRequestAI: (action: AiAction) => void
}

const actionLabels: Record<AiAction, string> = {
  analyze: "Explain Fit",
  price: "Suggest Price",
  write: "Draft Proposal"
}

export function AiActionsPanel({
  loadingAction,
  result,
  error,
  onRequestAI
}: Props) {
  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        AI Actions
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(actionLabels) as AiAction[]).map((action) => (
          <button
            key={action}
            type="button"
            disabled={loadingAction !== null}
            onClick={() => onRequestAI(action)}
            className="rounded border border-blue-200 bg-blue-50 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            {loadingAction === action ? "Working..." : actionLabels[action]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs leading-relaxed text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
          <div className="mb-1 font-semibold text-slate-800">{result.title}</div>
          <div className="whitespace-pre-wrap">{result.content}</div>
        </div>
      )}
    </div>
  )
}
