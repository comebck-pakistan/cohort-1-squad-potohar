import type {
  DecisionResult,
  ExtractedJobData,
  FreelancerProfile
} from "../decision-engine/decisionTypes"

const DEFAULT_BACKEND_URL = "http://localhost:8000"

export type AiAction = "analyze" | "price" | "write"

export type AiActionResult = {
  title: string
  content: string
}

type BackendPayload = {
  jobData: ExtractedJobData
  freelancerProfile: FreelancerProfile
  decision: DecisionResult
}

export async function requestBackendAction(
  action: AiAction,
  payload: BackendPayload
): Promise<AiActionResult> {
  const pathByAction: Record<AiAction, string> = {
    analyze: "/analysis",
    price: "/pricing",
    write: "/proposal"
  }

  const response = await fetch(`${getBackendBaseUrl()}${pathByAction[action]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      job_description: payload.jobData.rawDescription,
      job_data: payload.jobData,
      freelancer_profile: payload.freelancerProfile,
      decision: payload.decision
    })
  })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }

  const body = (await response.json()) as Record<string, unknown>

  if (typeof body.error === "string") {
    return {
      title: "Backend Not Ready",
      content: body.error
    }
  }

  if (action === "analyze") {
    return {
      title: "Fit Analysis",
      content: String(body.reasoning ?? "No analysis returned.")
    }
  }

  if (action === "price") {
    return {
      title: "Suggested Price",
      content: [
        formatRateRange(body),
        body.rationale ? String(body.rationale) : ""
      ]
        .filter(Boolean)
        .join("\n\n")
    }
  }

  return {
    title: "Proposal Draft",
    content: [body.hook_text, body.draft_text].filter(Boolean).join("\n\n")
  }
}

function getBackendBaseUrl(): string {
  return process.env.PLASMO_PUBLIC_BACKEND_API_BASE_URL ?? DEFAULT_BACKEND_URL
}

function formatRateRange(body: Record<string, unknown>): string {
  const min = body.suggested_rate_min
  const max = body.suggested_rate_max

  if (typeof min === "number" && typeof max === "number") {
    return `$${min}-$${max}`
  }

  return "No rate range returned."
}
