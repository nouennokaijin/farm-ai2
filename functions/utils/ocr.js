// utils/ocr.js

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===== OCR関数 =====
// imageUrl: 外部公開URL（Google Driveなど）
// 戻り値：抽出されたテキスト
async function extractTextFromImage(imageUrl) {
  try {
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("invalid imageUrl");
    }

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
あなたはOCRエンジンです。
画像内の文字をすべて正確に抽出してください。
余計な説明は不要。テキストのみ返す。
`,
        },
        {
          role: "user",
          content: imageUrl,
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
