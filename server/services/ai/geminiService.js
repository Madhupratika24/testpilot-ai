import { GoogleGenAI } from "@google/genai";
import { AiError } from "./AiError.js";
import { buildReviewRequest } from "./reviewPrompt.js";
import { parseAiFindings } from "./validateAiResponse.js";

const TIMEOUT_MS = 45000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("AI review is unavailable: the Gemini API key is not set on the server.");
  }
  return new GoogleGenAI({ apiKey });
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
  if (status === 500 || status === 503) {
    return "The AI service is temporarily unavailable. Please try again later.";
  }
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(text)) {
    return "Could not reach the AI service. Check the internet connection.";
  }
  return "The AI review could not be completed.";
}

// Asks Gemini to review code and returns checked findings
export async function reviewCode({ language, code, fileName }) {
  const client = getClient();
  const { systemInstruction, userPrompt } = buildReviewRequest({ language, code, fileName });

  let text;
  let timer;
  try {
    const call = client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("timed out")), TIMEOUT_MS);
    });
    const response = await Promise.race([call, timeout]);
    text = response.text;
  } catch (err) {
    console.error("Gemini error:", err?.status, err?.message);
    throw new AiError(friendlyMessage(err));
  } finally {
    clearTimeout(timer);
  }

  return parseAiFindings(text, { code, fileName });
}