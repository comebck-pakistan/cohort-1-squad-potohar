importScripts("pipeline.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type !== "ANALYZE_FULL_JOB") {
    return false;
  }

  (async () => {
    try {
      const pageText = String(request.payload || "");
      const data = await self.JobAnalysisPipeline.runJobAnalysisPipeline(
        pageText
      );

      sendResponse({ success: true, data });
    } catch (error) {
      console.error("[Connects Optimizer] Pipeline failed:", error);
      sendResponse({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown analysis error occurred."
      });
    }
  })();

  return true;
});
