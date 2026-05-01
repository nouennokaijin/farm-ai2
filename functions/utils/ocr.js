// utils/ocr.js

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================
// OCR（Groq Vision版）
// Cloudinary画像 → テキスト抽出
// =====================================
async function extractTextFromImage(imageUrl) {
  try {
    // ================================
    // 入力チェック
    // ================================
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("invalid imageUrl");
    }

    // ================================
    // Groq Visionモデル
    // ※画像対応モデルを使用
    // ================================
    const res = await client.chat.completions.create({
      model: "llama-4-scout-17b-16e-instruct", // ← Vision対応モデル
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
あなたは高精度OCRエンジンです。

やること：
- 画像内の文字を正確に抽出する
- 改行・構造をできるだけ保持する
- 余計な説明は禁止
- 出力はテキストのみ
`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この画像の文字をすべて抽出してください",
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

    const text = res?.choices?.[0]?.message?.content?.trim();

    return text || "";

  } catch (err) {
    console.error("OCR error:", err);
    return "";
  }
}

module.exports = { extractTextFromImage };
