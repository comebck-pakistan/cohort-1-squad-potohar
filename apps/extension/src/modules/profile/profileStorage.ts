import type { FreelancerProfile } from "./profileTypes"

const PROFILE_KEY = "freelancer_profile"
const EVENTS_KEY = "local_events"

export type LocalEvent = {
  eventType: "job_scored" | "job_skipped" | "ai_action_requested"
  metadata: Record<string, unknown>
  createdAt: string
}

export async function getProfile(): Promise<FreelancerProfile | null> {
  const values = await chrome.storage.local.get(PROFILE_KEY)
  return (values[PROFILE_KEY] as FreelancerProfile | undefined) ?? null
}

export async function saveProfile(profile: FreelancerProfile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile })
}

export async function logLocalEvent(
  eventType: LocalEvent["eventType"],
  metadata: Record<string, unknown>
): Promise<void> {
  const values = await chrome.storage.local.get(EVENTS_KEY)
  const events = ((values[EVENTS_KEY] as LocalEvent[] | undefined) ?? []).slice(
    -99
  )

  events.push({
    eventType,
    metadata,
    createdAt: new Date().toISOString()
  })

  await chrome.storage.local.set({ [EVENTS_KEY]: events })
}

export async function getLocalEvents(): Promise<LocalEvent[]> {
  const values = await chrome.storage.local.get(EVENTS_KEY)
  return (values[EVENTS_KEY] as LocalEvent[] | undefined) ?? []
}
