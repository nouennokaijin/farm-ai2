// services/smartOCR.js
// 2026/5/2
// Okiura Kazuo（安定版：型安全＋OCR品質制御＋AI暴走防止）

const { extractTextFromImage } = require("../utils/ocr");
const Groq = require("groq-sdk");

// ================================
// 🤖 AIクライアント（意味補正用）
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧼 共通：テキスト正規化
// ================================
function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") return input;

  if (Array.isArray(input)) {
    return input.join("\n");
  }

  if (typeof input === "object") {
    // OCR事故時の保険
    return JSON.stringify(input);
  }

  return String(input);
}

// ================================
// ① OCR実行（URL専用）
// ================================
async function runOCR(imageUrl) {
  try {
    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      throw new Error("invalid imageUrl");
    }

    const result = await extractTextFromImage(imageUrl);

    return normalizeText(result);

  } catch (e) {
    console.error("OCR error:", e);
    return "";
  }
}

// ================================
// ② OCR品質スコア（軽量判定）
// ================================
function estimateQuality(text) {
  if (!text) return 0;

  const length = text.length;

  // 文字が短すぎる＝低品質
  if (length < 5) return 0.1;

  // それなりに文章っぽい
  if (length < 30) return 0.5;

  return 1;
}

// ================================
// ③ AI補正（暴走防止付き）
// ================================
async function refineText(rawText) {
  const text = normalizeText(rawText).trim();

  if (!text) return "";

  // ⚠️ 短すぎる場合はAIに投げない（暴走防止）
  const quality = estimateQuality(text);
  if (quality < 0.3) {
    return text;
  }

  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはOCR誤認識の修正エンジンです。

ルール：
- 意味の補完は禁止
- 事実の追加は禁止
- 文脈の創作は禁止
- 文字の整形のみ行う
- 出力は修正後テキストのみ
          `.trim(),
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const output =
      res?.choices?.[0]?.message?.content;

    return normalizeText(output || text);

  } catch (e) {
    console.error("AI refine error:", e);
    return text;
  }
}

// ================================
// ④ メインOCRパイプライン
// ================================
async function smartOCR(imageUrl) {
  try {

    // ================================
    // Step1: OCR
    // ================================
    const rawText = await runOCR(imageUrl);

    if (!rawText) {
      console.warn("⚠️ OCR returned empty text");

      return {
        rawText: "",
        refinedText: "",
        quality: 0,
      };
    }

    // ================================
    // Step2: 品質評価
    // ================================
    const quality = estimateQuality(rawText);

    // ================================
    // Step3: AI補正
    // ================================
    const refinedText = await refineText(rawText);

    // ================================
    // 📦 出力スキーマ統一
    // ================================
    return {
      rawText: normalizeText(rawText),
      refinedText: normalizeText(refinedText),
      quality, // ← 追加（デバッグ＆将来分類用）
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
