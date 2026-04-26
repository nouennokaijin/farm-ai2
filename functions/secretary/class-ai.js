// class-ai.js


const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function aiclass(text) {
  const res = await client.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
あなたは分類AI。
必ず次のいずれか1語のみ返す:

POST
RECEIPT
SCHEDULE
CHAT

それ以外は禁止。
不明な場合はCHAT。
        `.trim(),
      },
      { role: "user", content: text },
    ],
  });

  return res?.choices?.[0]?.message?.content?.trim() || "POST"; //"CHAT";
}

module.exports = async function getIntent(text) {
  const raw = await aiclass(text);
  return raw; // もう正規化いらない設計
};
