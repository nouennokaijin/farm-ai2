// secretary/classifyAI.js
// 2026/05/04
// 🤖 テキスト分類AI（Groq）
// ・文章の目的を分類
// ・必ず1単語で返す（post / receipt / schedule / ocr / chat）

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 AI分類関数
// ================================
async function classifyAI(inputText) {
  try {
    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.2,
      max_completion_tokens: 10,
      messages: [
        {
          role: "system",
          content: `
文章の目的で分類してください。
必ず以下のどれか1単語だけを返してください。

post     投稿系（農業・プログラム・メモ）
receipt  レシート・支出
schedule 予定・日付
ocr      文字起こし依頼
chat     その他・雑談

【ルール】
・必ず1単語のみ
・説明禁止
・迷ったら chat
`
        },
        {
          role: "user",
          content: (inputText || "").slice(0, 300)
        }
      ]
    });

    const raw = res.choices?.[0]?.message?.content?.trim().toLowerCase() || "";

    // ================================
    // 🛡 安全フィルター
    // ================================
    const valid = ["post", "receipt", "schedule", "ocr", "chat"];
    return valid.find(v => raw.includes(v)) || "chat";

  } catch (err) {
    console.error("❌ classifyAIエラー:", err);
    return "chat";
  }
}

// ================================
// 📤 エクスポート
// ================================
module.exports = { classifyAI };
