// services/smartOCR.js
// 2026/5/2
// Okiura Kazuo（改良版：URL統一・安定OCR）

const { extractTextFromImage } = require("../utils/ocr");
const Groq = require("groq-sdk");

// ================================
// AIクライアント（意味補正用）
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// ① OCR実行（URL専用）
// ================================
async function runOCR(imageUrl) {
  try {
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("invalid imageUrl");
    }

    return await extractTextFromImage(imageUrl);
  } catch (e) {
    console.error("OCR error:", e);
    return "";
  }
}

// ================================
// ② AI補正（意味復元）
// ================================
async function refineText(rawText) {
  if (!rawText?.trim()) return "";

  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはOCRの誤認識修正エンジンです。

ルール：
- 文字の崩れを自然な日本語に修正
- 意味の補完はしない
- 追加情報は禁止
- 出力は修正後テキストのみ
          `.trim(),
        },
        {
          role: "user",
          content: rawText,
        },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || rawText;
  } catch (e) {
    console.error("AI refine error:", e);
    return rawText;
  }
}

// ================================
// ③ メインOCRパイプライン（URL統一版）
// ================================
async function smartOCR(imageUrl) {
  try {
    // Step1: OCR（URL直接）
    const rawText = await runOCR(imageUrl);

    if (!rawText) {
      console.warn("⚠️ OCR returned empty text");
      return {
        rawText: "",
        refinedText: "",
      };
    }

    // Step2: AI補正
    const refinedText = await refineText(rawText);

    return {
      rawText,
      refinedText,
    };

  } catch (e) {
    console.error("smartOCR fatal error:", e);

    return {
      rawText: "",
      refinedText: "",
    };
  }
}

module.exports = {
  smartOCR,
};
