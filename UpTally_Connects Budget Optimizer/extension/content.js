console.log("UpTally: staged pipeline overlay loaded");

let lastProcessedUrl = "";
let profile = null;
let profileLoadStarted = false;
let profileFormVisible = false;
let syncTimer = null;
let analysisGeneration = 0;
let observedUrl = "";

function isSupportedUpworkRoute() {
  const path = window.location.pathname;
  return (
    /\/jobs(?:\/|$)/.test(path) ||
    /\/find-work(?:\/|$)/.test(path) ||
    /\/search\/jobs(?:\/|$)/.test(path)
  );
}

function hasSelectedJobDetail() {
  const path = window.location.pathname;
  if (/\/jobs\/~[A-Za-z0-9]+/i.test(path)) return true;

  // Find Work is an SPA route.  A selected job uses a detail panel rather
  // than a separate /jobs/~ URL, so rely on several stable, human-visible
  // labels instead of any one client statistic.
  const text = (document.body?.innerText || "").toLowerCase();
  const detailSignals = [
    "about the client",
    "client's recent history",
    "activity on this job",
    "connects required",
    "submit a proposal",
  ];
  return detailSignals.filter((signal) => text.includes(signal)).length >= 2;
}

function checkAndCleanUp() {
  if (!isSupportedUpworkRoute()) {
    if (
      lastProcessedUrl !== "" ||
      document.getElementById("connects-optimizer-widget")
    ) {
      removeWidget();
      lastProcessedUrl = "";
      profileFormVisible = false;
      analysisGeneration += 1;
    }
    return true;
  }

  return false;
}

function schedulePageSync(delay = 900) {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncCurrentPage, delay);
}

function syncCurrentPage() {
  if (checkAndCleanUp()) return;

  if (!profileLoadStarted) {
    profileLoadStarted = true;
    chrome.storage.local.get(["freelancerProfile"], (stored) => {
      profile = stored?.freelancerProfile || null;
      if (!isSupportedUpworkRoute()) return;

      if (!profile) {
        profileFormVisible = true;
        renderProfileSetup();
        return;
      }

      profileFormVisible = false;
      renderReadyState();
    });
    return;
  }

  if (!profile || profileFormVisible) return;
  renderReadyState();
}

function observeUpworkNavigation() {
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== observedUrl) {
      observedUrl = currentUrl;
      schedulePageSync(1200);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", () => schedulePageSync(1200));
  window.addEventListener("hashchange", () => schedulePageSync(1200));
  observedUrl = window.location.href;
  schedulePageSync(1200);
}

observeUpworkNavigation();

function analyzeCurrentJob() {
  const currentUrl = window.location.href;
  if (!profile) return;

  const pageText = document.body.innerText || "";
  if (pageText.trim().length < 250) {
    renderUIOverlay({
      status: "waiting",
      message:
        "The job details are still loading. Please wait a moment and try again.",
    });
    return;
  }

  lastProcessedUrl = currentUrl;
  const requestGeneration = ++analysisGeneration;
  removeWidget();
  renderUIOverlay({
    status: "loading",
    message: "Stage 1/3: extracting job details from the page text...",
  });

  try {
    chrome.runtime.sendMessage(
      { type: "ANALYZE_FULL_JOB", payload: pageText, profile },
      (response) => {
        if (
          requestGeneration !== analysisGeneration ||
          currentUrl !== window.location.href
        ) {
          return;
        }

        if (chrome.runtime.lastError) {
          renderUIOverlay({
            status: "error",
            message: "Connection lost. Refresh the page and try again.",
          });
          return;
        }

        if (response && response.success) {
          displayFinalEvaluation(response.data);
          return;
        }

        renderUIOverlay({
          status: "error",
          message: `Analysis failed: ${response?.error || "Unknown error occurred."}`,
        });
      },
    );
  } catch (error) {
    renderUIOverlay({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Extension context invalidated. Refresh the tab and try again.",
    });
  }
}

function renderReadyState() {
  if (!profile || profileFormVisible || !isSupportedUpworkRoute()) return;

  renderUIOverlay({
    status: "ready",
    message: hasSelectedJobDetail()
      ? "Ready to analyze the selected job."
      : "First Open a Job page, then analyze it.",
  });
}

function renderProfileSetup() {
  injectScrollbarCSS();
  removeWidget();

  const widget = document.createElement("div");
  widget.id = "connects-optimizer-widget";
  widget.style.cssText =
    "position: fixed; bottom: 30px; right: 30px; z-index: 999999; padding: 20px; background: #ffffff; border-radius: 14px; box-shadow: 0 12px 35px rgba(0,0,0,0.15); width: 360px; max-height: 85vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 6px solid #3182ce;";
  widget.innerHTML = `
    <div style="font-weight: bold; font-size: 15px; color: #1a202c; margin-bottom: 6px;">Set up your freelancer profile</div>
    <div style="font-size: 12px; color: #718096; line-height: 1.5; margin-bottom: 14px;">Saved once in this browser and used to personalize job scores and proposals.</div>
    <form id="connects-profile-form">
      ${profileInput("profile-name", "Name", "e.g. Ayesha Khan", true)}
      ${profileInput("profile-experience", "Experience level", "e.g. Intermediate, 4 years", true)}
      ${profileInput("profile-skills", "Skills", "e.g. React, Python, UI/UX", true)}
      ${profileInput("profile-portfolio", "Portfolio (optional)", "URL(s), separated by commas", false)}
      <label style="display:block; font-size:12px; color:#4a5568; margin: 10px 0 4px;">Bio (optional)</label>
      <textarea id="profile-bio" rows="3" placeholder="Short professional summary" style="box-sizing:border-box; width:100%; resize:vertical; border:1px solid #cbd5e0; border-radius:6px; padding:8px; font:inherit; font-size:12px;"></textarea>
      <div id="profile-error" style="display:none; color:#c53030; font-size:12px; margin:8px 0;"></div>
      <button type="submit" style="width:100%; border:0; border-radius:7px; padding:10px; color:#fff; background:#3182ce; font-weight:700; cursor:pointer;">Save profile</button>
    </form>
  `;
  document.body.appendChild(widget);

  document
    .getElementById("connects-profile-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextProfile = {
        name: document.getElementById("profile-name").value.trim(),
        experienceLevel: document
          .getElementById("profile-experience")
          .value.trim(),
        skills: document
          .getElementById("profile-skills")
          .value.split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        portfolio: document
          .getElementById("profile-portfolio")
          .value.split(",")
          .map((url) => url.trim())
          .filter(Boolean),
        bio: document.getElementById("profile-bio").value.trim(),
      };

      const error = document.getElementById("profile-error");
      if (
        !nextProfile.name ||
        !nextProfile.experienceLevel ||
        nextProfile.skills.length === 0
      ) {
        error.textContent =
          "Name, experience level, and at least one skill are required.";
        error.style.display = "block";
        return;
      }

      chrome.runtime.sendMessage(
        { type: "SAVE_PROFILE", profile: nextProfile },
        (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            error.textContent =
              response?.error ||
              "Could not save profile. Refresh and try again.";
            error.style.display = "block";
            return;
          }

          profile = nextProfile;
          profileFormVisible = false;
          lastProcessedUrl = "";
          renderReadyState();
        },
      );
    });
}

function profileInput(id, label, placeholder, required) {
  return `<label style="display:block; font-size:12px; color:#4a5568; margin: 10px 0 4px;">${label}${required ? " *" : ""}</label><input id="${id}" ${required ? "required" : ""} placeholder="${placeholder}" style="box-sizing:border-box; width:100%; border:1px solid #cbd5e0; border-radius:6px; padding:8px; font:inherit; font-size:12px;" />`;
}

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
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c;">UpTally - Connects Budget Optimizer</div>
      <div style="font-size: 13px; color: #4a5568; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
        <div style="width: 14px; height: 14px; border: 2px solid #3182ce; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        ${escapeHtml(uiState.message)}
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    return;
  }

  if (uiState.status === "ready" || uiState.status === "waiting") {
    const ready = uiState.status === "ready";
    widget.style.borderLeftColor = ready ? "#14a800" : "#dd6b20";
    widget.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <span>UpTally - Connects Budget Optimizer</span>
        <button id="connects-optimizer-close" type="button" aria-label="Close" style="border:0; background:transparent; cursor:pointer; color:#a0aec0; font-size:18px; line-height:1;">&times;</button>
      </div>
      <div style="font-size: 13px; color: #4a5568; line-height: 1.5; margin-bottom: 12px;">${escapeHtml(
        uiState.message,
      )}</div>
      <button id="connects-optimizer-analyze" type="button" style="width:100%; border:0; border-radius:7px; padding:10px; color:#fff; background:#14a800; font-weight:700; cursor:pointer;">Analyze this job</button>
      <div style="font-size:11px; color:#718096; line-height:1.45; margin-top:10px;">The extension reads the page and contacts Decision Engine only after you select this button.</div>
    `;

    document
      .getElementById("connects-optimizer-close")
      ?.addEventListener("click", removeWidget);
    document
      .getElementById("connects-optimizer-analyze")
      ?.addEventListener("click", analyzeCurrentJob);
    return;
  }

  if (uiState.status === "error") {
    widget.style.borderLeftColor = "#e53e3e";
    widget.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c; display: flex; justify-content: space-between; align-items: center;">
        <span>UpTally - Connects Budget Optimizer</span>
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
            proposal.proposal,
          )}</div>
        </div>
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Why It Fits</div>
          <div style="font-size: 13px; color: #2d3748; line-height: 1.6;">${escapeHtml(
            proposal.fitExplanation || "",
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
      <span>UpTally</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 11px; padding: 3px 10px; border-radius: 20px; color: #fff; background: ${badgeColor}; font-weight: 800; letter-spacing: 0.5px;">${escapeHtml(
          decision,
        )}</span>
        <span style="cursor: pointer; color: #a0aec0; font-size: 16px;" onclick="document.getElementById('connects-optimizer-widget')?.remove()">&times;</span>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Evaluation</div>
      <div style="font-size: 13px; color: #2d3748; line-height: 1.5;">
        <strong style="color: #1a202c;">Score ${escapeHtml(formatScore(evaluation.score))}</strong>
        <span style="color: #718096;"> | Confidence ${escapeHtml(
          formatConfidence(evaluation.confidence),
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
    ["Budget type", extraction.budgetType],
    ["Budget amount", extraction.budgetAmount],
    ["Experience level", extraction.experienceLevel],
    ["Payment verified", extraction.paymentVerified],
    ["Proposal range", extraction.proposalRange],
    ["Posted", extraction.postedAt],
    ["Proposal count", extraction.proposalCount],
    ["Client hire rate", extraction.client?.hireRate],
    ["Client total spent", extraction.client?.totalSpent],
    ["Client country", extraction.client?.country],
  ].filter(([, value]) => hasValue(value));

  const skills = Array.isArray(extraction.skills) ? extraction.skills : [];
  const skillsHtml =
    skills.length > 0
      ? `
        <div style="margin-top: 8px;">
          <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Required Skills</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${skills
              .map(
                (skill) =>
                  `<span style="font-size: 12px; color: #1a202c; background: #edf2f7; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 8px;">${escapeHtml(
                    String(skill),
                  )}</span>`,
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
                  formatDisplayValue(value),
                )}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `
    : "";

  return `
    <div style="margin-bottom: 2px;">
      <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Extracted Data</div>
      <div style="font-size: 11px; color: #3182ce; margin-bottom: 6px;">Metadata of this Job:</div>
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
              String(item),
            )}</li>`,
        )
        .join("")}
    </ul>
  `;
}

function normalizeDecision(decision) {
  const value = String(decision || "")
    .toLowerCase()
    .trim();

  if (value.includes("skip")) return "Skip";
  if (value.includes("apply") && value.includes("caution"))
    return "Apply with Caution";
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
