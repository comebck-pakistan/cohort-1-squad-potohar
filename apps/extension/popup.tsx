import React from "react"

function IndexPopup() {
  return (
    <main
      style={{
        width: 320,
        padding: 16,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
      }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
        Connects Budget Optimizer
      </h1>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
        Open an Upwork job page to see the floating Apply, Caution, or Skip
        score.
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Profile and scoring events are stored locally in your browser.
      </p>
    </main>
  )
}

export default IndexPopup
