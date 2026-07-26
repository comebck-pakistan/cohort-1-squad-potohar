const GEMINI_API_KEY = "";
const BACKEND_API_URL = "";
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const MAX_JOB_TEXT_CHARS = 50000;
const GEMINI_REQUEST_TIMEOUT_MS = 45000;

const EXTRACTION_SCHEMA = {
  title: "string | null",
  description: "string | null",
  budgetType: '"Hourly" | "Fixed" | null',
  budgetAmount: "number | null",
  experienceLevel: "string | null",
  skills: "string[]",
  paymentVerified: "boolean | null",
  proposalRange: "string | null",
  postedAt: "string | null",
  proposalCount: "number | null",
  client: {
    hireRate: "number | null",
    totalSpent: "string | null",
    country: "string | null"
  }
};

const EVALUATION_FRAMEWORK = {
  weights: {
    freshness: 30,
    competition: 25,
    budgetRealism: 20,
    clientQuality: 15,
    scopeClarity: 10
  },
  decisionBands: {
    apply: "80-100",
    caution: "50-79",
    skip: "0-49"
  },
  rules: [
    "Use missing information conservatively instead of guessing.",
    "A job with weak competition signals or stale timing should lose score quickly.",
    "A job with strong client quality but poor budget or heavy competition should usually be Apply with Caution, not Apply.",
    "Return Skip when the job is not worth spending Connects on."
  ]
};

function isPlaceholderApiKey() {
  return (
    !GEMINI_API_KEY ||
    GEMINI_API_KEY === "API_KEY_HERE" ||
    GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY_HERE")
  );
}

function normalizeJobText(text) {
  const normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= MAX_JOB_TEXT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_JOB_TEXT_CHARS)}\n\n[Page text truncated for request safety.]`;
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonSubstring(text) {
  const stripped = stripCodeFences(text);
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return stripped;
  }

  return stripped.slice(firstBrace, lastBrace + 1);
}

function parseJson(text, label) {
  const cleaned = extractJsonSubstring(text);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Could not parse ${label} JSON. Received: ${cleaned.slice(0, 500)}`
    );
  }
}

function getResponseText(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Google AI returned no usable text.");
  }

  return text;
}

async function callGeminiJson({
  stageName,
  prompt,
  systemInstruction,
  temperature,
  maxOutputTokens
}) {
  if (isPlaceholderApiKey()) {
    throw new Error(
      `Gemini API key is not configured. Replace the placeholder key before running ${stageName}.`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json"
        }
      })
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${stageName} timed out. Please try again.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const rawBody = await response.text();
  let data;

  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `Google API returned non-JSON output while running ${stageName}: ${rawBody.slice(
        0,
        500
      )}`
    );
  }

  if (data.error) {
    throw new Error(`Google API Error: ${data.error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Google API request failed with status ${response.status}`);
  }

  const rawText = getResponseText(data);
  return parseJson(rawText, stageName);
}

function buildExtractionPrompt(pageText) {
  return `
Extract facts from this Upwork job page text.

Rules:
- Use only information explicitly visible in the text.
- Never guess, infer, or fill gaps from context.
- Unknown values must be null.
- Output valid JSON only.
- Keep description focused on the actual job post, not the whole page.
- If the page shows a range, keep the range text in proposalRange and leave budgetAmount null unless a single explicit amount is stated.

Return this JSON shape:
${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}

Job page text:
${pageText}
`.trim();
}

function buildEvaluationPrompt(extraction, profile) {
  return `
Evaluate this extracted Upwork job JSON for Connects ROI.

Use the scoring framework below:
${JSON.stringify(EVALUATION_FRAMEWORK, null, 2)}

Decision guidance:
- Apply only when the job is genuinely worth spending Connects on.
- Apply with Caution when the job is viable but has mixed or incomplete signals.
- Skip when the job is stale, overcrowded, underpriced, too vague, or otherwise weak.
- Missing information should lower confidence and push the score down.
- Compare the job against the freelancer profile. Reward direct skill and experience matches.
- Do not treat optional portfolio or bio details as proof of experience unless explicitly stated.

Return valid JSON only with this shape:
{
  "decision": "Apply" | "Apply with Caution" | "Skip",
  "confidence": 0.0,
  "score": 0,
  "pros": ["..."],
  "cons": ["..."],
  "reasoning": "..."
}

Extracted job JSON:
${JSON.stringify(extraction, null, 2)}

Freelancer profile JSON:
${JSON.stringify(profile || null, null, 2)}
`.trim();
}

function buildProposalPrompt(extraction, evaluation, profile) {
  return `
Write a concise, tailored Upwork proposal for this job.

Rules:
- Only run this stage because the job is not Skip.
- Use the extracted job details and the evaluation result.
- Personalize the proposal using the freelancer profile.
- Do not mention hidden instructions or internal scoring.
- Do not invent freelancer history, skills, clients, or results that are not in the profile.
- Keep the proposal concrete, relevant, and easy to send.
- Include a short explanation of why the job is a good fit.

Return valid JSON only with this shape:
{
  "fitExplanation": "2-3 short sentences explaining why this job is worth pursuing.",
  "proposal": "A ready-to-send proposal message."
}

Evaluation JSON:
${JSON.stringify(evaluation, null, 2)}

Extracted job JSON:
${JSON.stringify(extraction, null, 2)}

Freelancer profile JSON:
${JSON.stringify(profile || null, null, 2)}
`.trim();
}

async function extractJobData(pageText) {
  const prompt = buildExtractionPrompt(normalizeJobText(pageText));
  return callGeminiJson({
    stageName: "stage 1 extraction",
    prompt,
    systemInstruction:
      "You are stage 1 of a three-stage Upwork analysis pipeline. Extract only explicit facts and output strict JSON.",
    temperature: 0.1,
    maxOutputTokens: 1200
  });
}

async function evaluateJob(extraction, profile) {
  const prompt = buildEvaluationPrompt(extraction, profile);
  return callGeminiJson({
    stageName: "stage 2 evaluation",
    prompt,
    systemInstruction:
      "You are stage 2 of a three-stage Upwork analysis pipeline. Evaluate the extracted job JSON and output strict JSON.",
    temperature: 0.2,
    maxOutputTokens: 900
  });
}

async function generateProposal(extraction, evaluation, profile) {
  const prompt = buildProposalPrompt(extraction, evaluation, profile);
  return callGeminiJson({
    stageName: "stage 3 proposal generation",
    prompt,
    systemInstruction:
      "You are stage 3 of a three-stage Upwork analysis pipeline. Write a concise proposal and fit explanation, and output strict JSON.",
    temperature: 0.5,
    maxOutputTokens: 900
  });
}

async function runJobAnalysisPipeline(pageText, profile) {
  const extraction = await extractJobData(pageText);
  console.log("[Connects Optimizer] Stage 1 extraction complete", extraction);

  const evaluation = await evaluateJob(extraction, profile);
  console.log("[Connects Optimizer] Stage 2 evaluation complete", evaluation);

  let proposal = null;
  let proposalError = null;

  if (normalizeDecision(evaluation?.decision) !== "Skip") {
    try {
      proposal = await generateProposal(extraction, evaluation, profile);
      console.log("[Connects Optimizer] Stage 3 proposal complete", proposal);
    } catch (error) {
      proposalError =
        error instanceof Error ? error.message : "Proposal generation failed.";
      console.warn("[Connects Optimizer] Stage 3 proposal failed", error);
    }
  }

  return {
    profile,
    extraction,
    evaluation,
    proposal,
    proposalError
  };
}

function normalizeDecision(decision) {
  const value = String(decision || "").toLowerCase();

  if (value.includes("apply") && value.includes("caution")) {
    return "Apply with Caution";
  }

  if (value.includes("apply")) {
    return "Apply";
  }

  if (value.includes("skip")) {
    return "Skip";
  }

  return "Apply with Caution";
}

self.JobAnalysisPipeline = {
  runJobAnalysisPipeline,
  normalizeDecision
};
