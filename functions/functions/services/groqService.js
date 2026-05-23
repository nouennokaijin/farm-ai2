// ========================================
// FILE: groqService.js
// PURPOSE: Groq API 接続
// ROLE: AIへメッセージ送信
// AUTHOR: OKIURA KAZUO
// ========================================

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ========================================
// chat
// ========================================
async function chat({ system, user, max_tokens }) {

  try {

    console.log("=================================");
    console.log("🧠 GROQ REQUEST START");
    console.log("=================================");

    const res = await client.chat.completions.create({

      model: "meta-llama/llama-4-scout-17b-16e-instruct",

      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: user
        }
      ],

      temperature: 0.7,

      // ====================================
      // TOKEN CONTROL（chatHandlerから受け取る）
      // ====================================
      max_tokens: max_tokens || 170
    });

    const text =
      res.choices?.[0]?.message?.content || "...";

    console.log("✅ GROQ RESPONSE SUCCESS");

    return text;

  } catch (err) {

    console.error("=================================");
    console.error("❌ GROQ SERVICE ERROR");
    console.error("=================================");
    console.error(err);

    return "通信エラーが発生しました。";
  }
}

module.exports = { chat };
