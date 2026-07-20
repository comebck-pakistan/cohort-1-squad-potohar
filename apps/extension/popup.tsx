import React, { useEffect, useState } from "react"
import { getLocalEvents, type LocalEvent } from "./src/modules/profile/profileStorage"

function IndexPopup() {
  const [events, setEvents] = useState<LocalEvent[]>([])

  useEffect(() => {
    getLocalEvents().then(setEvents)
  }, [])

  const scoredCount = events.filter(e => e.eventType === "job_scored").length
  const skippedCount = events.filter(e => e.eventType === "job_skipped").length

  // A rough estimate: say each skip saves 12 connects.
  const connectsSaved = skippedCount * 12

  const proposalsDrafted = events.filter(
    e => e.eventType === "ai_action_requested" && e.metadata.action === "draft_proposal"
  ).length

  return (
    <main
      style={{
        width: 340,
        padding: 20,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
      }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a", fontWeight: "bold" }}>
        Connects Budget Optimizer
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#475569" }}>
        Open an Upwork job page to see the floating Apply, Caution, or Skip score.
      </p>

      <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 14, color: "#334155", fontWeight: "600" }}>Your Impact</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 13 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#64748b" }}>Jobs Scored</span>
            <span style={{ color: "#0f172a", fontWeight: "600", fontSize: 16 }}>{scoredCount}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#64748b" }}>Jobs Skipped</span>
            <span style={{ color: "#0f172a", fontWeight: "600", fontSize: 16 }}>{skippedCount}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#64748b" }}>Connects Saved</span>
            <span style={{ color: "#22c55e", fontWeight: "600", fontSize: 16 }}>~{connectsSaved}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#64748b" }}>Proposals Drafted</span>
            <span style={{ color: "#0f172a", fontWeight: "600", fontSize: 16 }}>{proposalsDrafted}</span>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
        <strong>Privacy Notice:</strong> All profile data, extraction data, and local events are securely stored inside your browser. No data is sent to external servers unless you explicitely request an AI action.
      </p>
    </main>
  )
}

export default IndexPopup
