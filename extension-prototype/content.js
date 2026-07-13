console.log("⚙️ Connects Optimizer: SPA State Machine & Responsive UI Loaded");

let lastProcessedUrl = "";

// ⚡ NEW: Instant Cleanup Function
function checkAndCleanUp() {
    const currentUrl = window.location.href;
    const isJobPage = currentUrl.includes("~") || currentUrl.includes("/jobs/");

    if (!isJobPage) {
        if (lastProcessedUrl !== "") {
            // console.log("🧹 User left job page. Instantly cleaning up widget.");
            removeWidget();
            lastProcessedUrl = ""; // Reset state for the next job
        }
        return true;
    }
    return false;
}

// ⚡ NEW: Event-Driven Instant Close on Click
document.addEventListener("click", () => {
    // Give Upwork's React engine 50ms to update the URL after a click, then check and instantly close
    setTimeout(checkAndCleanUp, 50);
});

// Continuous SPA watcher loop
setInterval(() => {
    // If the click listener already cleaned it up, skip this loop
    if (checkAndCleanUp()) return;

    const currentUrl = window.location.href;
    const isJobPage = currentUrl.includes("~") || currentUrl.includes("/jobs/");
    const pageText = document.body.innerText;

    // 2. If the user opened a NEW job modal
    if (isJobPage && currentUrl !== lastProcessedUrl) {
        // Wait for Upwork's React components to finish rendering the text
        if (pageText.includes('hire rate') && pageText.includes('spent')) {
            // console.log("🎯 New job detected. Executing deep scan...");
            lastProcessedUrl = currentUrl; // Lock it in so we don't scan the same job twice
            
            removeWidget(); // Clear any old widget
            renderUIOverlay({ status: "loading", message: "Extracting job context & running AI analysis..." });

            // 🛡️ SAFETY NET: Catch the "Context Invalidated" error gracefully
            try {
                chrome.runtime.sendMessage({ 
                    type: "ANALYZE_FULL_JOB", 
                    payload: pageText 
                }, (response) => {
                    // Safety check if the connection was lost due to a reload
                    if (chrome.runtime.lastError) {
                        console.warn("Connection lost. Please refresh the page.");
                        return;
                    }

                    if (response && response.success) {
                        // console.log("⚡ AI Analysis Received");
                        displayFinalEvaluation(response.data);
                    } else {
                        renderUIOverlay({ 
                            status: "error", 
                            message: `Analysis Failed: ${response?.error || "Unknown error occurred."}` 
                        });
                    }
                });
            } catch (error) {
                console.warn("Extension context invalidated. Please refresh the Upwork tab.", error);
            }
        }
    }
}, 1000); // Returned to 1000ms for safety. The click listener handles the instant close!

function removeWidget() {
    const widget = document.getElementById("connects-optimizer-widget");
    if (widget) widget.remove();
}

// Injects custom scrollbar styling to make the widget look native and clean
function injectScrollbarCSS() {
    if (!document.getElementById("optimizer-scrollbar-css")) {
        const style = document.createElement("style");
        style.id = "optimizer-scrollbar-css";
        style.innerHTML = `
            #connects-optimizer-widget::-webkit-scrollbar { width: 6px; }
            #connects-optimizer-widget::-webkit-scrollbar-track { background: transparent; }
            #connects-optimizer-widget::-webkit-scrollbar-thumb { background-color: #cbd5e0; border-radius: 10px; }
            #connects-optimizer-widget { scrollbar-width: thin; scrollbar-color: #cbd5e0 transparent; }
        `;
        document.head.appendChild(style);
    }
}

function renderUIOverlay(uiState) {
    injectScrollbarCSS();
    removeWidget(); // Ensure no duplicates

    let widget = document.createElement("div");
    widget.id = "connects-optimizer-widget";
    // ADDED RESPONSIVENESS: max-height and overflow-y
    widget.style.cssText = "position: fixed; bottom: 30px; right: 30px; z-index: 999999; padding: 20px; background: #ffffff; border-radius: 14px; box-shadow: 0 12px 35px rgba(0,0,0,0.15); width: 340px; max-height: 85vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.3s ease; border-left: 6px solid #e0e0e0;";
    document.body.appendChild(widget);

    if (uiState.status === "loading") {
        widget.style.borderLeftColor = "#3182ce";
        widget.innerHTML = `
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c;">Connects Budget Optimizer</div>
            <div style="font-size: 13px; color: #4a5568; display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; border: 2px solid #3182ce; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                ${uiState.message}
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    } else if (uiState.status === "error") {
        widget.style.borderLeftColor = "#e53e3e";
        widget.innerHTML = `
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px; color: #1a202c; display: flex; justify-content: space-between;">
                <span>Connects Budget Optimizer</span>
                <span style="cursor: pointer; color: #a0aec0;" onclick="document.getElementById('connects-optimizer-widget').remove()">✕</span>
            </div>
            <div style="font-size: 13px; color: #e53e3e;">${uiState.message}</div>
        `;
    }
}

function displayFinalEvaluation(aiData) {
    const widget = document.getElementById("connects-optimizer-widget");
    if (!widget) return;

    // --- SAFEGUARD BADGE MAPPER ---
    const rawVerdict = (aiData.verdict || "CAUTION").toUpperCase().trim();
    
    let displayVerdict = "CAUTION";
    let badgeColor = "#dd6b20"; // Default Orange

    if (rawVerdict.includes("APPLY")) {
        displayVerdict = "APPLY";
        badgeColor = "#14a800"; // Green
    } else if (rawVerdict.includes("SKIP") || rawVerdict.includes("RISK")) {
        displayVerdict = "SKIP";
        badgeColor = "#e53e3e"; // Red
    } else if (rawVerdict.includes("CAUTION")) {
        displayVerdict = "CAUTION";
        badgeColor = "#dd6b20"; // Orange
    } else {
        displayVerdict = "CAUTION";
        badgeColor = "#dd6b20"; 
    }

    widget.style.borderLeftColor = badgeColor;
    // ------------------------------

    const renderBullets = (bullets) => {
        if (!bullets || bullets.length === 0) return '';
        return `<ul style="margin: 6px 0 0 0; padding-left: 20px; color: #4a5568; list-style-type: disc;">
            ${bullets.map(b => `<li style="margin-bottom: 4px;">${b}</li>`).join('')}
        </ul>`;
    };

    // ⚡ NEW: Conditional Rendering Logic for Hooks
    // Only generate the hooks HTML if the verdict is NOT "SKIP"
    const hooksSectionHTML = displayVerdict === "SKIP" ? "" : `
        <div>
            <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">High-Impact Hooks</div>
            ${(aiData.hooks || []).map(hook => `<div style="font-size: 13px; color: #1a202c; background: #f7fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 8px; font-style: italic; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">"${hook}"</div>`).join('')}
        </div>
    `;

    widget.innerHTML = `
        <div style="font-weight: bold; font-size: 15px; margin-bottom: 12px; color: #1a202c; display: flex; justify-content: space-between; align-items: center;">
            <span>Connects Optimizer</span>
            <div>
                <span style="font-size: 11px; padding: 3px 10px; border-radius: 20px; color: #fff; background: ${badgeColor}; font-weight: 800; margin-right: 8px; letter-spacing: 0.5px;">${displayVerdict}</span>
                <span style="cursor: pointer; color: #a0aec0; font-size: 16px;" onclick="document.getElementById('connects-optimizer-widget').remove()">✕</span>
            </div>
        </div>
        
        <div style="margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Audit Breakdown</div>
            <div style="font-size: 13px; color: #2d3748; line-height: 1.5;">
                <strong style="color: #1a202c;">${aiData.auditSummary}</strong>
                ${renderBullets(aiData.auditBullets)}
            </div>
        </div>

        <div style="margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #718096; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Budget Realism</div>
            <div style="font-size: 13px; color: #2d3748; line-height: 1.5;">
                <strong style="color: #1a202c;">${aiData.budgetSummary}</strong>
                ${renderBullets(aiData.budgetBullets)}
            </div>
        </div>

        ${hooksSectionHTML}
    `;

}