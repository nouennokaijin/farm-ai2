// utils/ocr.js
// 2026/5/2
// Okiura Kazuo

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================
// 🧠 OCR（Visionエンジン）
// =====================================
async function extractTextFromImage(imageUrl) {
  try {

    // ================================
    // 🚨 入力チェック（重要）
    // ================================
    if (!imageUrl || typeof imageUrl !== "string") {
      console.error("❌ OCR input invalid:", imageUrl);

      return {
        text: "",
        success: false,
        reason: "invalid_imageUrl",
      };
    }

    console.log("🔍 OCR REQUEST:", imageUrl);

    // ================================
    // 🤖 Vision OCR
    // ================================
    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたは超高精度OCRエンジンです。

ルール：
- 画像内の文字をそのまま抽出
- 改行・段落構造を維持
- 推測は禁止
- 補完は禁止
- 意味解釈は禁止
- 出力は純テキストのみ
          `.trim(),                                                                                                                    },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "画像内の文字をすべて正確に抽出してください",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });

    // ================================
    // � 結果取得
    // ================================
    const text = res?.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      console.warn("⚠️ OCR returned empty result");

      return {
        text: "",
        success: false,
        reason: "empty_result",
      };
    }

    console.log("✅ OCR SUCCESS");

    return {
      text,
      success: true,
      reason: "ok",
    };

  } catch (err) {

    // ================================
    // ❌ エラーハンドリング（可視化）
    // ================================
    console.error("❌ OCR error:", err);

    return {
      text: "",                                                                      success: false,                                                                reason: "ocr_exception",
    };
  }                                                                            }

module.exports = { extractTextFromImage };
