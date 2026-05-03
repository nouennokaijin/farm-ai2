// utils/ocr.js
// 2026/5/3 改良版（最小・純OCR特化）
// Okiura Kazuo

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================
// 🧠 OCR（Visionベース・純テキスト返却）
// =====================================
async function extractTextFromImage(imageUrl) {
  // ================================
  // 🚨 入力チェック
  // ================================
  if (!imageUrl || typeof imageUrl !== "string") {
    console.error("❌ OCR input invalid:", imageUrl);
    return "";
  }

  console.log("🔍 OCR REQUEST:", imageUrl);

  try {
    // ================================
    // 🤖 Vision OCR（LLM利用）
    // ================================
    const res = await client.chat.completions.create({
      // ⚠️ モデル注意：
      // llamaはVision非対応の可能性があるため、
      // 将来的にはVision対応モデルに差し替え推奨
      model: "meta-llama/llama-4-scout-17b-16e-instruct",

      temperature: 0, // 🔒 ブレ防止（重要）

      messages: [
        {
          role: "system",
          content: `
あなたはOCRエンジンです。
画像に含まれる文字をそのまま出力してください。

ルール：
- 文字をそのまま抽出
- 改行を維持
- 補完・推測・説明は禁止
- 出力はテキストのみ
          `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "画像内の文字をすべて抽出してください",
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
    // 🧾 レスポンス取得
    // ================================
    let text = res?.choices?.[0]?.message?.content || "";

    // ================================
    // 🧹 軽いクリーニング
    // ================================
    text = text.trim();

    // ❗ LLMが余計な説明を付けた場合の保険
    // （例：「以下に抽出結果を示します」など）
    if (text.includes("以下") || text.includes("抽出")) {
      console.warn("⚠️ OCR noisy output detected");
    }

    // ================================
    // 📊 空チェック
    // ================================
    if (!text) {
      console.warn("⚠️ OCR returned empty result");
      return "";
    }

    console.log("✅ OCR RESULT:");
    console.log(text);

    // ================================
    // 🎯 純テキストのみ返却
    // ================================
    return text;

  } catch (err) {
    // ================================
    // ❌ エラーハンドリング
    // ================================
    console.error("❌ OCR error:", err);
    return "";
  }
}

module.exports = {
  extractTextFromImage,
};
