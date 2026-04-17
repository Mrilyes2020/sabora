import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const SYSTEM_PROMPT_BASE = `
You are an expert academic assistant specialized in analyzing academic content and converting it into perfectly structured material.

Your tasks:
1. READ everything provided with high accuracy.
2. IDENTIFY the academic subject and topic automatically.
3. STRUCTURE the content logically: Definition → Theorem → Proof → Examples → Notes.

STRICT RULES:
- Every mathematical expression MUST be converted to valid LaTeX syntax.
- Use proper LaTeX environments: \\equation for single equations, \\align for multi-line, \\begin{theorem}, \\begin{proof}, \\begin{definition}.
- If any text in image is unclear, write: [unclear text].
- Detect language used (Arabic/French/English) and match it.
- Never invent content not present in the sources.

OUTPUT FORMAT - return ONLY this JSON, no extra text:
{
  "topic": "detected lesson topic",
  "subject": "Mathematics / Physics / Chemistry / etc",
  "latex": "complete LaTeX document with \\\\documentclass{article}, all \\\\usepackage, full content inside document environment",
  "organized": "full lesson in Arabic: title, definitions, theorems with proofs, worked examples, notes",
  "summary": "concise 6-8 sentence summary of key points",
  "exercises": "3-5 related practice problems in LaTeX format"
}
`;

const AUDIO_PROMPT_ADDITION = `
Additionally, you have been provided with an audio recording of the teacher explaining the lesson.
TASKS:
1. Transcribe the teacher's speech accurately.
2. Match the spoken explanation to the written content on the board.
3. Add any verbal explanations, examples, or hints the teacher mentioned that are NOT written on the board.
4. Mark teacher's verbal additions with EXACTLY this HTML formatting so it can be styled properly: <span class="audio-extract">🎙️ Teacher said: [insert what they said here]</span>
5. If teacher corrected something on the board, reflect the correction.
OUTPUT: Merge board content + audio explanation into one unified, richer lesson, applying the HTML tag above for verbal-only content.
`;

export async function analyzeBlackboard(
  image: { base64: string; mimeType: string } | null,
  audio: { base64: string; mimeType: string } | null
): Promise<AnalysisResult> {
  const parts: any[] = [];
  
  let prompt = SYSTEM_PROMPT_BASE;
  if (audio) {
    prompt += "\n" + AUDIO_PROMPT_ADDITION;
  }
  
  parts.push({ text: prompt });
  
  if (image) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64.includes(",") ? image.base64.split(",")[1] : image.base64,
      },
    });
  }
  
  if (audio) {
    parts.push({
      inlineData: {
        mimeType: audio.mimeType,
        data: audio.base64.includes(",") ? audio.base64.split(",")[1] : audio.base64,
      },
    });
  }
  
  const instructionText = [];
  if (image && audio) {
    instructionText.push("Analyze this blackboard photo and the audio recording, and return the specified JSON.");
  } else if (image) {
    instructionText.push("Analyze this blackboard photo and return the specified JSON.");
  } else if (audio) {
    instructionText.push("Analyze this audio recording of a lesson and return the specified JSON.");
  }
  parts.push({ text: instructionText.join(" ") });

  const model = ai.models.generateContent({
    model: "gemini-2.0-flash", 
    contents: [
      {
        role: "user",
        parts: parts,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  const resultText = response.text || "";
  
  try {
    return JSON.parse(resultText) as AnalysisResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", resultText);
    throw new Error("Failed to analyze the content. The AI response was not in the expected format.");
  }
}

