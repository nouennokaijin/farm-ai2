// utils/imageAI.js
// 2026/5/2
// 🧠 画像事前理解AI（OCR前フィルタ）

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 画像内容の事前解析
// ================================
async function analyzeImage(imageUrl) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
あなたは画像の事前解析AIです。

目的：
- 画像の種類を判断
- OCRが必要か判定
- 内容を短く要約

出力形式：
{
  "type": "document | receipt | photo | noise",
  "needOCR": true/false,
  "summary": "短い説明"
}

※推測しすぎ禁止
          `.trim(),
        },
        {
          role: "user",
          content: imageUrl,
        },
      ],
      temperature: 0.2,
    });

    return JSON.parse(res?.choices?.[0]?.message?.content || "{}");
  } catch (e) {
    console.error("imageAI failed:", e);
    return {
      type: "unknown",
      needOCR: true,
      summary: "",
    };
  }
}

module.exports = { analyzeImage };
