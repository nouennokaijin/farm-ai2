const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.nouennokaijin,
});

async function askGroq(text) {
  const res = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: "あなたは優秀なAI秘書です。簡潔で分かりやすく答えてください。",
      },
      { role: "user", content: text },
    ],
  });

  return res.choices[0].message.content;
}

// 👇これ追加
module.exports = { askGroq };
