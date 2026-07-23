import React from "react"

import type { AiAction, AiActionResult } from "../api/backendClient"
import type {
  DecisionResult,
  ExtractedJobData
} from "../decision-engine/decisionTypes"
import { AiActionsPanel } from "./AiActionsPanel"

interface Props {
  decision: DecisionResult
  jobData: ExtractedJobData
  loadingAction: AiAction | null
  aiResult: AiActionResult | null
  aiError: string | null
  onEditProfile: () => void
  onJobDataChange: (data: ExtractedJobData) => void
  onRequestAI: (action: AiAction) => void
}

export const JobScorePanel: React.FC<Props> = ({
  decision,
  jobData,
  loadingAction,
  aiResult,
  aiError,
  onEditProfile,
  onJobDataChange,
  onRequestAI
}) => {
  const badgeColor =
    decision.decision === "Apply"
      ? "bg-green-600"
      : decision.decision === "Skip"
        ? "bg-red-600"
        : "bg-orange-500"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold text-slate-800">
          Job Score: {decision.score}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-white ${badgeColor}`}>
          {decision.decision.toUpperCase()}
        </span>
      </div>

      <div className="rounded border border-slate-100 bg-slate-50 p-2 text-[13px] leading-relaxed text-slate-700">
        <strong>Reason:</strong> {decision.reason}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Extracted Data
        </div>
        <div className="text-[11px] leading-snug text-slate-500">
          Budget amount is the numeric rate or project total when Upwork
          exposes it explicitly. For hourly ranges, the popup stores the midpoint so the score engine has one number to compare.
          Budget type means <span className="font-medium">hourly</span> for per-hour
          jobs, <span className="font-medium">fixed</span> for one-off project budgets, and{" "}
          <span className="font-medium">unknown</span> when the page does not state it clearly.
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1 text-slate-600">
            Budget / rate ($)
            <input
              type="number"
              className="rounded border px-1 py-0.5"
              value={jobData.budgetAmount ?? ""}
              onChange={(e) =>
                onJobDataChange({
                  ...jobData,
                  budgetAmount: Number(e.target.value) || null,
                  extractionMethod: "manual_fallback"
                })
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-slate-600">
            Proposals
            <input
              type="number"
              className="rounded border px-1 py-0.5"
              value={jobData.proposalCount ?? ""}
              onChange={(e) =>
                onJobDataChange({
                  ...jobData,
                  proposalCount: Number(e.target.value) || null,
                  extractionMethod: "manual_fallback"
                })
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-slate-600">
            Budget Type
            <select
              className="rounded border px-1 py-0.5"
              value={jobData.budgetType}
              onChange={(e) =>
                onJobDataChange({
                  ...jobData,
                  budgetType: e.target.value as ExtractedJobData["budgetType"],
                  extractionMethod: "manual_fallback"
                })
              }>
              <option value="unknown">Unknown</option>
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-slate-600">
            Payment
            <select
              className="rounded border px-1 py-0.5"
              value={jobData.paymentVerified}
              onChange={(e) =>
                onJobDataChange({
                  ...jobData,
                  paymentVerified: e.target
                    .value as ExtractedJobData["paymentVerified"],
                  extractionMethod: "manual_fallback"
                })
              }>
              <option value="unknown">Unknown</option>
              <option value="yes">Verified</option>
              <option value="no">Unverified</option>
            </select>
          </label>
        </div>
      </div>

      <button
        type="button"
        className="text-left text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        onClick={onEditProfile}>
        Edit profile
      </button>

      {decision.decision !== "Skip" && (
        <AiActionsPanel
          error={aiError}
          loadingAction={loadingAction}
          result={aiResult}
          onRequestAI={onRequestAI}
        />
      )}
    </div>
  )
}
