import type { PlasmoCSConfig } from "plasmo"
import cssText from "data-text:~/style.css"
import React, { useEffect, useState } from "react"

import {
  type AiAction,
  type AiActionResult,
  requestBackendAction
} from "../modules/api/backendClient"
import { calculateScore } from "../modules/decision-engine/calculateScore"
import type {
  DecisionResult,
  ExtractedJobData,
  FreelancerProfile
} from "../modules/decision-engine/decisionTypes"
import { extractJobData } from "../modules/extraction/extractJobData"
import {
  getProfile,
  logLocalEvent,
  saveProfile
} from "../modules/profile/profileStorage"
import { FloatingOverlay } from "../modules/ui/FloatingOverlay"
import { JobScorePanel } from "../modules/ui/JobScorePanel"
import { ProfileSetup } from "../modules/ui/ProfileSetup"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.upwork.com/jobs/*",
    "https://*.upwork.com/ab/jobs/*",
    "https://*.upwork.com/nx/find-work/*"
  ],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function UpworkJobOverlay() {
  const [isJobPage, setIsJobPage] = useState(false)
  const [url, setUrl] = useState("")
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [jobData, setJobData] = useState<ExtractedJobData | null>(null)
  const [decision, setDecision] = useState<DecisionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [loadingAction, setLoadingAction] = useState<AiAction | null>(null)
  const [aiResult, setAiResult] = useState<AiActionResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const lastExtractionSignatureRef = React.useRef("")
  const lastSyncedUrlRef = React.useRef("")

  useEffect(() => {
    getProfile().then((storedProfile) => {
      setProfile(storedProfile)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const syncCurrentPage = () => {
      const currentUrl = window.location.href
      const nextIsJob = hasActiveJobDetail(currentUrl)

      if (currentUrl !== lastSyncedUrlRef.current) {
        setAiError(null)
        setAiResult(null)
        lastSyncedUrlRef.current = currentUrl
      }

      setIsJobPage(nextIsJob)
      setUrl(currentUrl)

      if (!nextIsJob) {
        setJobData(null)
        setDecision(null)
        lastExtractionSignatureRef.current = ""
        return
      }
    }

    syncCurrentPage()

    const clickListener = () => window.setTimeout(syncCurrentPage, 50)
    const interval = window.setInterval(syncCurrentPage, 1000)
    document.addEventListener("click", clickListener)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("click", clickListener)
    }
  }, [])

  useEffect(() => {
    if (!isJobPage || !profile) return

    let cancelled = false

    const extractCurrentJob = () => {
      if (cancelled) return

      const pageText = normalizeJobText(getActiveJobText(url))
      if (!pageText) return

      const signature = `${url}::${pageText}`
      if (signature === lastExtractionSignatureRef.current) return

      lastExtractionSignatureRef.current = signature

      const extracted = extractJobData(pageText)
      const nextDecision = calculateScore(extracted, profile)

      console.log("[Upwork raw extracted job data]", extracted)

      setJobData(extracted)
      setDecision(nextDecision)
      logScoreEvent(nextDecision, extracted)
    }

    extractCurrentJob()
    const interval = window.setInterval(extractCurrentJob, 750)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isJobPage, profile, url])

  if (!isJobPage) return null

  const handleSaveProfile = async (newProfile: FreelancerProfile) => {
    await saveProfile(newProfile)
    setProfile(newProfile)
    setEditingProfile(false)

    if (isJobPage) {
      const extracted = extractJobData(normalizeJobText(getActiveJobText(url)))
      console.log("[Upwork raw extracted job data]", extracted)
      setJobData(extracted)
    }
  }

  const handleRequestAI = async (action: AiAction) => {
    if (!profile || !jobData || !decision || decision.decision === "Skip") return

    setLoadingAction(action)
    setAiError(null)
    setAiResult(null)

    try {
      await logLocalEvent("ai_action_requested", {
        action,
        score: decision.score,
        decision: decision.decision,
        sourcePlatform: jobData.sourcePlatform
      })

      const result = await requestBackendAction(action, {
        decision,
        freelancerProfile: profile,
        jobData
      })

      setAiResult(result)
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Could not reach the backend service."
      )
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <FloatingOverlay onClose={() => setIsJobPage(false)}>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : !profile || editingProfile ? (
        <ProfileSetup initialProfile={profile} onSave={handleSaveProfile} />
      ) : !decision || !jobData ? (
        <div className="flex items-center gap-2 text-[13px] text-slate-700">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          Reading job page...
        </div>
      ) : (
        <JobScorePanel
          aiError={aiError}
          aiResult={aiResult}
          decision={decision}
          jobData={jobData}
          loadingAction={loadingAction}
          onEditProfile={() => setEditingProfile(true)}
          onJobDataChange={setJobData}
          onRequestAI={handleRequestAI}
        />
      )}
    </FloatingOverlay>
  )
}

function getActiveJobText(currentUrl: string): string {
  const selectors = [
    ".up-slider",
    ".air3-slider",
    '[data-test="job-details-slider"]',
    '[data-test="job-description"]',
    '[data-test="job-details"]'
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement && isVisibleElement(element)) {
      const text = element.innerText?.trim()
      if (text && isTrustedJobText(text, selector, currentUrl)) return text
    }
  }

  if (isLikelyDedicatedJobRoute(currentUrl)) {
    const main = document.querySelector("main")
    if (main instanceof HTMLElement && isVisibleElement(main)) {
      const text = main.innerText?.trim()
      if (text && isTrustedJobText(text, "main", currentUrl)) return text
    }
  }

  return ""
}

function normalizeJobText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim()
}

function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.getClientRects().length > 0
  )
}

function isLikelyDedicatedJobRoute(currentUrl: string): boolean {
  try {
    const { pathname } = new URL(currentUrl)
    return pathname.includes("/~")
  } catch {
    return false
  }
}

function hasActiveJobDetail(currentUrl: string): boolean {
  return Boolean(getActiveJobText(currentUrl))
}

function isTrustedJobText(
  text: string,
  selector: string,
  currentUrl: string
): boolean {
  const normalized = normalizeJobText(text).toLowerCase()
  const hasPricingSignal = [
    /\b(?:fixed[\s-]*price|hourly|per\s+hour|\/\s*hr|\/\s*hour)\b/i,
    /\bbudget\b/i
  ].some((regex) => regex.test(normalized))
  const hasCompetitionSignal = [/\bproposals?\b/i].some((regex) =>
    regex.test(normalized)
  )
  const hasClientSignal = [
    /\bpayment(?:\s+method)?\s+(?:verified|unverified|not\s+verified)\b/i,
    /\bclient(?:'s)?\s+recent\s+history\b/i,
    /\btotal\s+spent\b/i,
    /\bhires?\b/i,
    /\breviews?\b/i,
    /\brating\b/i
  ]

  const signalHits = [
    hasPricingSignal ? 1 : 0,
    hasCompetitionSignal ? 1 : 0,
    hasClientSignal ? 1 : 0
  ].reduce((sum, hit) => sum + hit, 0)

  if (selector !== "main") {
    return signalHits >= 2 && hasClientSignal && normalized.length >= 120
  }

  if (selector === "main" && isLikelyDedicatedJobRoute(currentUrl)) {
    return signalHits >= 2 && normalized.length >= 180
  }

  return false
}

function logScoreEvent(
  decision: DecisionResult,
  jobData: ExtractedJobData
): void {
  const metadata = {
    score: decision.score,
    decision: decision.decision,
    sourcePlatform: jobData.sourcePlatform,
    budgetType: jobData.budgetType,
    budgetAmount: jobData.budgetAmount
  }

  logLocalEvent("job_scored", metadata)

  if (decision.decision === "Skip") {
    logLocalEvent("job_skipped", {
      ...metadata,
      reason: decision.reason
    })
  }
}
