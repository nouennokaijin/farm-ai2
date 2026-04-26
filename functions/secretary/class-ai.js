// class-ai.js

const groq = require("groq-sdk");

const client = new groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function aiclass(text) {
  const res = await client.chat.completions.create({
    model: "llama3-70b-8192",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
あなたは分類専用AIです。
必ず以下のどれか1語だけを返してください。

POST
RECEIPT
SCHEDULE
CHAT

他の文章は一切出さないこと。
        `,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return res.choices[0].message.content.trim();
}

function normalizeIntent(intent) {
  const i = intent.toUpperCase();

  if (i.includes("POST")) return "POST";
  if (i.includes("RECEIPT")) return "RECEIPT";
  if (i.includes("SCHEDULE")) return "SCHEDULE";
  return "CHAT";
}

async function getIntent(text) {
  const raw = await aiclass(text);
  return normalizeIntent(raw);
}

module.exports = { getIntent };
