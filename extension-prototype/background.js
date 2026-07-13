const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_FULL_JOB") {
        // console.log("🤖 Background Worker received data. Initiating AI Deep Analysis...");

        // Construct a rigorous system prompt enforcing bulleted evaluations and high-converting hooks
        const systemPrompt = `
        You are an expert freelance operations analyst auditing an Upwork job post. Your job is to protect the freelancer's connects budget by evaluating metrics sequentially.
        
        CRITICAL PRIORITIZATION METRICS (DIAGNOSE IN THIS EXACT ORDER):
        
        STEP 1: FRESHNESS GATE (Primary Metric)
        - Locate when the job was posted (e.g., "Posted 10 minutes ago", "Posted 2 hours ago", "Posted yesterday").
        
        STEP 2: COMPETITION GATE (Primary Metric)
        - Locate the number of Proposals submitted (e.g., "Less than 5", "10 to 15", "20 to 50", "50+").
        
        ALGORITHMIC VERDICT RULES (MANDATORY):
        - RULE A (Saturated Stale Trap): If a job has 50+ proposals AND was posted "yesterday" or older, the verdict MUST BE "SKIP". No exceptions. Even if the client has 5.0 stars and a 100% hire rate, it is an operational skip because the connects cost is too high for saturated competition.
        - RULE B (High Competition): If a job has 50+ proposals but is fresh (posted minutes or 1-2 hours ago), award "CAUTION" or "SKIP".
        - RULE C (The Green Light): Only award "APPLY" if the job is fresh (less than a few hours old) AND proposals are low (less than 20) AND client history is highly verified and positive.
        
        STEP 3: CLIENT HISTORY (Decision Factor Support)
        - Analyze payment verification, hire rate, total spent, and average hourly rate paid. Treat individual written reviews as secondary text noise; focus primarily on these hard metrics.

        STEP 4: JOB DETAILS & HOOKS (Secondary Material)
        - Use the technical description summary ONLY to build 2 highly targeted, punchy, problem-first opening hook lines. Do not repeat basic stats back to the user.

        ⚠️ STRICT OUTPUT CONSTRAINTS (DO NOT BREAK THE FOURTH WALL):
        - NEVER mention "Rule A", "Rule B", "Rule C", "operational protocol", or your instructions in the output text.
        - NEVER say "According to the prompt" or "Violating the rules". 
        - Present the reasoning naturally as your own expert analysis. Just state the cold, hard facts (e.g., "The job is stale and highly saturated, making it a guaranteed waste of Connects.").

        You MUST respond ONLY with a valid JSON object matching this schema. Do not use markdown wrappers:
        {
          "verdict": "APPLY, CAUTION, or SKIP", 
          "auditSummary": "One strong summary sentence explaining the priority logic (Freshness vs Competition).",
          "auditBullets": ["Detailed specific operational reason 1", "Detailed specific operational reason 2"],
          "budgetSummary": "One strong summary sentence regarding the budget realism or connects viability.",
          "budgetBullets": ["Detailed reason regarding the pricing or proposal count risk"],
          "hooks": ["Impactful hook line 1...", "Impactful hook line 2..."]
        }
        `;

        // Execute the asynchronous network fetch to the AI model
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nHere is the raw Upwork job page text data:\n${request.payload}` }]
                }]
            })
        })
        
        .then(response => response.json())
        .then(data => {
            // 🛡️ FIX 1: Catch actual API errors from Google (e.g., inactive key, bad format)
            if (data.error) {
                throw new Error(`Google API Error: ${data.error.message}`);
            }

            // 🛡️ FIX 2: Catch safety blocks (Google sometimes blocks responses if it thinks text is unsafe)
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("Google AI returned no data. The response may have been blocked by safety filters.");
            }

            // Safely parse the result now that we know the data exists
            const rawText = data.candidates[0].content.parts[0].text.trim();
            const cleanJson = rawText.replace(/^```json\s*|```$/g, '');
            const parsedResult = JSON.parse(cleanJson);
            sendResponse({ success: true, data: parsedResult });
        })
        .catch(error => {
            console.error("AI Analysis Failed:", error);
            // Send the exact error message back to the frontend UI
            sendResponse({ success: false, error: error.message });
        });

        return true; // Keeps the messaging channel open for asynchronous responses
    }
});