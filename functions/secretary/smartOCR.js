// services/smartOCR.js
// 2026/5/3 改良版
// 「必ず値を返す」「空を作らない」仕様に変更

const { extractTextFromImage } = require("../utils/ocr");
const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧹 正規化
// ================================
function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") return input;

  if (Array.isArray(input)) return input.join("\n");

  if (typeof input === "object") return JSON.stringify(input);

  return String(input);
}

// ================================
// OCR実行
// ================================
async function runOCR(imageUrl) {
  try {
    const result = await extractTextFromImage(imageUrl);
    return normalizeText(result);
  } catch (e) {
    console.error("OCR error:", e);
    return "";
  }
}

// ================================
// 品質評価
// ================================
function estimateQuality(text) {
  if (!text) return 0;
  if (text.length < 5) return 0.1;
  if (text.length < 30) return 0.5;
  return 1;
}

// ================================
// AI補正（安全運転）
// ================================
async function refineText(rawText) {
  const text = normalizeText(rawText).trim();
  if (!text) return "";

  const quality = estimateQuality(text);

  // 短すぎる場合はそのまま返す
  if (quality < 0.3) return text;

  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "OCR誤認識の修正のみ行う。創作禁止。",
        },
        { role: "user", content: text },
      ],
    });

    return normalizeText(
      res?.choices?.[0]?.message?.content || text
    );

  } catch (e) {
    console.error("AI refine error:", e);
    return text;
  }
}

// ================================
// メインOCR
// ================================
async function smartOCR(imageUrl) {
  try {
    const rawText = await runOCR(imageUrl);
    const quality = estimateQuality(rawText);
    const refinedText = await refineText(rawText);

    // ================================
    // 📦 絶対に空構造を返さない
    // ================================
    return {
      rawText: rawText || "",
      refinedText: refinedText || rawText || "",
      quality,
    };

  } catch (e) {
    console.error("smartOCR fatal error:", e);

    return {
      rawText: "",
      refinedText: "",
      quality: 0,
    };
  }
}

module.exports = {
  smartOCR,
};
