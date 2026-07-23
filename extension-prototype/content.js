console.log("Connects Optimizer: staged pipeline overlay loaded");

let lastProcessedUrl = "";

function checkAndCleanUp() {
  const currentUrl = window.location.href;
  const isJobPage = currentUrl.includes("~") || currentUrl.includes("/jobs/");

  if (!isJobPage) {
    if (lastProcessedUrl !== "") {
      removeWidget();
      lastProcessedUrl = "";
    }
    return true;
  }

  return false;
}

document.addEventListener("click", () => {
  setTimeout(checkAndCleanUp, 50);
});

setInterval(() => {
  if (checkAndCleanUp()) return;

  const currentUrl = window.location.href;
  const isJobPage = currentUrl.includes("~") || currentUrl.includes("/jobs/");
  const pageText = document.body.innerText || "";

  if (isJobPage && currentUrl !== lastProcessedUrl) {
    if (pageText.includes("hire rate") && pageText.includes("spent")) {
      lastProcessedUrl = currentUrl;

      removeWidget();
      renderUIOverlay({
        status: "loading",
        message: "Stage 1/3: extracting job details from the page text..."
      });

      try {
        chrome.runtime.sendMessage(
          {
            type: "ANALYZE_FULL_JOB",
            payload: pageText
          },
          (response) => {
            if (chrome.runtime.lastError) {
              renderUIOverlay({
                status: "error",
                message: "Connection lost. Refresh the page and try again."
              });
              return;
            }

            if (response && response.success) {
              displayFinalEvaluation(response.data);
              return;
            }

            renderUIOverlay({
              status: "error",
              message: `Analysis failed: ${response?.error || "Unknown error occurred."}`
            });
          }
        );
      } catch (error) {
        renderUIOverlay({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Extension context invalidated. Refresh the tab and try again."
        });
      }
    }
  }
}, 1000);

function removeWidget() {
  const widget = document.getElementById("connects-optimizer-widget");
  if (widget) widget.remove();
}

function injectScrollbarCSS() {
  if (document.getElementById("optimizer-scrollbar-css")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "optimizer-scrollbar-css";
  style.textContent = `
    #connects-optimizer-widget::-webkit-scrollbar { width: 6px; }
    #connects-optimizer-widget::-webkit-scrollbar-track { background: transparent; }
    #connects-optimizer-widget::-webkit-scrollbar-thumb { background-color: #cbd5e0; border-radius: 10px; }
    #connects-optimizer-widget { scrollbar-width: thin; scrollbar-color: #cbd5e0 transparent; }
  `;
  document.head.appendChild(style);
}

function renderUIOverlay(uiState) {
  injectScrollbarCSS();
  removeWidget();

  const widget = document.createElement("div");
  widget.id = "connects-optimizer-widget";
  widget.style.cssText =
    "position: fixed; bottom: 30px; right: 30px; z-index: 999999; padding: 20px; background: #ffffff; border-radius: 14px; box-shadow: 0 12px 35px rgba(0,0,0,0.15); width: 360px; max-height: 85vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.3s ease; border-left: 6px solid #e0e0e0;";
  document.body.appendChild(widget);

  if (uiState.status === "loading") {
    widget.style.borderLeftColor = "#3182ce";
    widget.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c;">Connects Budget Optimizer</div>
      <div style="font-size: 13px; color: #4a5568; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
        <div style="width: 14px; height: 14px; border: 2px solid #3182ce; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        ${escapeHtml(uiState.message)}
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    return;
  }

  if (uiState.status === "error") {
    widget.style.borderLeftColor = "#e53e3e";
    widget.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c; display: flex; justify-content: space-between; align-items: center;">
        <span>Connects Budget Optimizer</span>
        <span style="cursor: pointer; color: #a0aec0;" onclick="document.getElementById('connects-optimizer-widget')?.remove()">&times;</span>
      </div>
      <div style="font-size: 13px; color: #e53e3e; line-height: 1.5;">${escapeHtml(uiState.message)}</div>
    `;
  }
}

function displayFinalEvaluation(result) {
  const widget = document.getElementById("connects-optimizer-widget");
  if (!widget) return;

  const extraction = result?.extraction || {};
  const evaluation = result?.evaluation || {};
  const proposal = result?.proposal || null;
  const decision = normalizeDecision(evaluation.decision);
  const badgeColor = getDecisionColor(decision);

  widget.style.borderLeftColor = badgeColor;

  const prosHtml = renderBulletList(evaluation.pros);
  const consHtml = renderBulletList(evaluation.cons);
  const proposalHtml =
    decision !== "Skip" && proposal && typeof proposal.proposal === "string"
      ? `
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Proposal Draft</div>
          <div style="font-size: 13px; color: #2d3748; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">${escapeHtml(
            proposal.proposal
          )}</div>
        </div>
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Why It Fits</div>
          <div style="font-size: 13px; color: #2d3748; line-height: 1.6;">${escapeHtml(
            proposal.fitExplanation || ""
          )}</div>
        </div>
      `
      : "";

  const extractionHtml = renderExtractionSection(extraction);
  const warningHtml =
    result?.proposalError && decision !== "Skip"
      ? `
        <div style="margin-bottom: 14px; border: 1px solid #fed7d7; background: #fff5f5; color: #c53030; border-radius: 8px; padding: 10px 12px; font-size: 12px; line-height: 1.5;">
          Proposal generation failed: ${escapeHtml(result.proposalError)}
        </div>
      `
      : "";

  widget.innerHTML = `
    <div style="font-weight: bold; font-size: 15px; margin-bottom: 12px; color: #1a202c; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
      <span>Connects Optimizer</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 11px; padding: 3px 10px; border-radius: 20px; color: #fff; background: ${badgeColor}; font-weight: 800; letter-spacing: 0.5px;">${escapeHtml(
          decision
        )}</span>
        <span style="cursor: pointer; color: #a0aec0; font-size: 16px;" onclick="document.getElementById('connects-optimizer-widget')?.remove()">&times;</span>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Evaluation</div>
      <div style="font-size: 13px; color: #2d3748; line-height: 1.5;">
        <strong style="color: #1a202c;">Score ${escapeHtml(formatScore(evaluation.score))}</strong>
        <span style="color: #718096;"> | Confidence ${escapeHtml(
          formatConfidence(evaluation.confidence)
        )}</span>
        <div style="margin-top: 6px;">${escapeHtml(evaluation.reasoning || "")}</div>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Pros</div>
      ${prosHtml}
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Cons</div>
      ${consHtml}
    </div>

    ${warningHtml}
    ${proposalHtml}
    ${extractionHtml}
  `;
}

function renderExtractionSection(extraction) {
  const rows = [
    ["Title", extraction.title],
    ["Description", extraction.description],
    ["Budget type", extraction.budgetType],
    ["Budget amount", extraction.budgetAmount],
    ["Experience level", extraction.experienceLevel],
    ["Payment verified", extraction.paymentVerified],
    ["Proposal range", extraction.proposalRange],
    ["Posted", extraction.postedAt],
    ["Proposal count", extraction.proposalCount],
    ["Client hire rate", extraction.client?.hireRate],
    ["Client total spent", extraction.client?.totalSpent],
    ["Client country", extraction.client?.country]
  ].filter(([, value]) => hasValue(value));

  const skills = Array.isArray(extraction.skills) ? extraction.skills : [];
  const skillsHtml =
    skills.length > 0
      ? `
        <div style="margin-top: 8px;">
          <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Skills</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${skills
              .map(
                (skill) =>
                  `<span style="font-size: 12px; color: #1a202c; background: #edf2f7; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 8px;">${escapeHtml(
                    String(skill)
                  )}</span>`
              )
              .join("")}
          </div>
        </div>
      `
      : "";

  const rowsHtml = rows.length
    ? `
      <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 12px; color: #2d3748;">
        ${rows
          .map(
            ([label, value]) => `
              <div style="display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #edf2f7; padding-bottom: 4px;">
                <span style="color: #718096;">${escapeHtml(label)}</span>
                <span style="text-align: right; color: #1a202c;">${escapeHtml(
                  formatDisplayValue(value)
                )}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";

  return `
    <div style="margin-bottom: 2px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Extracted Data</div>
      ${rowsHtml}
      ${skillsHtml}
    </div>
  `;
}

function renderBulletList(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (list.length === 0) {
    return '<div style="font-size: 13px; color: #718096;">No items returned.</div>';
  }

  return `
    <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #4a5568; list-style-type: disc;">
      ${list
        .map(
          (item) =>
            `<li style="margin-bottom: 4px; line-height: 1.5;">${escapeHtml(
              String(item)
            )}</li>`
        )
        .join("")}
    </ul>
  `;
}

function normalizeDecision(decision) {
  const value = String(decision || "").toLowerCase().trim();

  if (value.includes("skip")) return "Skip";
  if (value.includes("apply") && value.includes("caution")) return "Apply with Caution";
  if (value.includes("apply")) return "Apply";
  if (value.includes("caution")) return "Apply with Caution";

  return "Apply with Caution";
}

function getDecisionColor(decision) {
  if (decision === "Apply") return "#14a800";
  if (decision === "Skip") return "#e53e3e";
  return "#dd6b20";
}

function formatScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "N/A";
  return `${Math.max(0, Math.min(100, Math.round(score)))}/100`;
}

function formatConfidence(confidence) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) return "N/A";
  const value = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value);
}

function hasValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  return true;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
