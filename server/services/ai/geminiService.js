import { GoogleGenAI } from "@google/genai";
import { AiError } from "./AiError.js";
import { buildReviewRequest } from "./reviewPrompt.js";
import { parseAiFindings } from "./validateAiResponse.js";

// Wait times between retries when Google says it is busy
const RETRY_DELAYS = [2000, 5000];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("AI review is unavailable: the Gemini API key is not set on the server.");
  }
  return new GoogleGenAI({ apiKey });
}

// Reads the reply text, whichever way this version of the library provides it
function extractText(response) {
  if (typeof response?.text === "string") return response.text;
  if (typeof response?.text === "function") {
    try {
      const value = response.text();
      if (typeof value === "string") return value;
    } catch {
      // fall through to the next method
    }
  }
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => !p?.thought) // skip the model's private "thinking" parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("");
}

// True when the problem is on Google's side and trying again may work
function isTemporary(err) {
  const status = err?.status || err?.code;
  return status === 500 || status === 503 || /unavailable|overloaded|high demand/i.test(String(err?.message || ""));
}

// Turns technical errors into short messages that are safe to show
function friendlyMessage(err) {
  const status = err?.status || err?.code;
  const text = String(err?.message || "");

  if (/timed out/i.test(text)) return "The AI review took too long. Please try again.";
  if (status === 429 || /quota|rate limit/i.test(text)) {
    return "The AI service is busy or the free limit was reached. Please try again in a minute.";
  }
  if (status === 401 || status === 403 || /api key/i.test(text)) {
    return "The AI service rejected the API key. Check GEMINI_API_KEY on the server.";
  }
  if (status === 404 || /not found/i.test(text)) {
    return "The AI model was not found. Check GEMINI_MODEL on the server.";
  }
  if (isTemporary(err)) {
    return "The AI service is temporarily unavailable. Please try again in a few minutes.";
  }
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(text)) {
    return "Could not reach the AI service. Check the internet connection.";
  }
  return "The AI review could not be completed.";
}

// One call to one model, with a time limit
async function callModel(client, model, { systemInstruction, userPrompt, timeoutMs }) {
  let timer;
  try {
    const call = client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("timed out")), timeoutMs);
    });
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Tries one model, and retries when Google says it is busy
async function tryModel(client, model, options) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callModel(client, model, options);
    } catch (err) {
      console.error(`Gemini error (${model}, try ${attempt + 1}):`, err?.status, err?.message);
      if (!isTemporary(err) || attempt >= RETRY_DELAYS.length) throw err;
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
}

// Sends a prompt to Gemini and returns the reply text (which should be JSON)
export async function generateJson({ systemInstruction, userPrompt, timeoutMs = 45000 }) {
  const client = getClient();

  // The main model first. A backup model is used only if you set GEMINI_FALLBACK_MODEL.
  const models = [process.env.GEMINI_MODEL || "gemini-3.5-flash"];
  if (process.env.GEMINI_FALLBACK_MODEL) models.push(process.env.GEMINI_FALLBACK_MODEL);

  let response;
  let lastError;
  for (const model of models) {
    try {
      response = await tryModel(client, model, { systemInstruction, userPrompt, timeoutMs });
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!response) {
    throw new AiError(friendlyMessage(lastError));
  }

  const finishReason = response?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    console.error("Gemini finishReason:", finishReason);
  }

  const text = extractText(response);
  if (!text.trim()) {
    throw new AiError("The AI returned an empty response. Please try again.");
  }
  return text;
}

// Asks Gemini to review pasted code and returns checked findings
export async function reviewCode({ language, code, fileName }) {
  const { systemInstruction, userPrompt } = buildReviewRequest({ language, code, fileName });
  const text = await generateJson({ systemInstruction, userPrompt });
  return parseAiFindings(text, { code, fileName });
}