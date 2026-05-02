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

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("invalid imageUrl");
    }

    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたは超高精度OCRエンジンです。

ルール：
- 文字を忠実に抽出
- 改行構造を保持
- 推測禁止
- 補完禁止
- 出力はテキストのみ
          `.trim(),
        },
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

    return res?.choices?.[0]?.message?.content?.trim() || "";

  } catch (err) {
    console.error("OCR error:", err);
    return "";
  }
}

module.exports = { extractTextFromImage };
