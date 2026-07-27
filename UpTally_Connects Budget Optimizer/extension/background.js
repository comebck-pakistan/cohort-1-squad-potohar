function isUpworkContentScript(sender) {
  try {
    return new URL(sender?.url || "").hostname.endsWith(".upwork.com");
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isUpworkContentScript(sender)) {
    sendResponse({
      success: false,
      error: "This request must come from an Upwork page.",
    });
    return false;
  }

if (request?.type === "SAVE_PROFILE") {
    (async () => {
      try {
        const profile = request.profile;
        await chrome.storage.local.set({ freelancerProfile: profile });
        
        // Supabase network fetch has been completely removed from here
        
        sendResponse({ success: true, profile });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Could not save profile.",
        });
      }
    })();
    return true;
  }

  if (request?.type === "ANALYZE_FULL_JOB") {
    (async () => {
      try {
        const pageText = String(request.payload || "");
        const profile = request.profile || null;

        if (pageText.trim().length < 250) {
          throw new Error("The selected job did not contain enough readable detail. Wait for it to load and try again.");
        }

        const response = await fetch("http://localhost:8000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageText, profile })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Server error encountered during analysis.");
        }

        const data = await response.json();
        sendResponse({ success: true, data: data.data });
      } catch (error) {
        console.error("[Connects Optimizer] Pipeline failed:", error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown analysis error occurred.",
        });
      }
    })();
    return true;
  }

  return false;
});