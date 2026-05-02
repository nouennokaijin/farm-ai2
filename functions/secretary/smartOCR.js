// services/smartOCR.js
// 2026/5/2
// Okiura Kazuo

const sharp = require("sharp");
const { extractTextFromImage } = require("../utils/ocr");
const Groq = require("groq-sdk");

// ================================
// AIクライアント（意味補正用）
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// ① 画像前処理（人間の目に寄せる）
// ================================
async function preprocessImage(buffer) {
  try {
    const processed = await sharp(buffer)
      // ノイズ軽減
      .median(1)

      // コントラスト強化（文字浮き上がり）
      .modulate({
        brightness: 1.1,
        contrast: 1.4,
        saturation: 1.0,
      })

      // シャープネス
      .sharpen()

      // グレースケール化（OCR安定化）
      .grayscale()

      .toBuffer();

    return processed;
  } catch (e) {
    console.error("image preprocess error:", e);
    return buffer; // fallback
  }
}

// ================================
// ② OCR実行
// ================================
async function runOCR(buffer) {
  try {
    return await extractTextFromImage(buffer);
  } catch (e) {
    console.error("OCR error:", e);
    return "";
  }
}

// ================================
// ③ AIによる「人間的読み直し」
// ================================
async function refineText(rawText) {
  if (!rawText || rawText.trim().length === 0) return "";

  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはOCRの誤認識を修正するリーダーです。

役割：
- 崩れた文字を自然な日本語に復元
- レシート・メモ・投稿の意味を補正
- ただし情報は追加しない（推測禁止）

出力は「修正後テキストのみ」
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
// ④ メインOCRパイプライン
// ================================
async function smartOCR(imageBuffer) {
  try {
    // Step1: 前処理
    const optimized = await preprocessImage(imageBuffer);

    // Step2: OCR
    const rawText = await runOCR(optimized);

    // Step3: AI補正
    const refined = await refineText(rawText);

    return {
      rawText,
      refinedText: refined,
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
