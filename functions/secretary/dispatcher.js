// dispatcher.js
// 2026/04/27

const Groq = require("groq-sdk");

// handlers
const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===== AI分類 =====
async function classify(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "POST / RECEIPT / SCHEDULE / CHAT のどれか1語だけ返す。不明はCHAT。",
        },
        { role: "user", content: text },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || "CHAT";
  } catch (e) {
    console.error("AI classify error:", e);
    return "CHAT";
  }
}

// ===== dispatcher =====
async function dispatcher(event) {
  try {
    if (!event || event.type !== "message") return;

    const message = event.message;
    const replyToken = event.replyToken;

    if (!message || !replyToken) return;

    // TEXT
    if (message.type === "text") {
      const text = message.text || "";

      if (text.includes("投稿")) {
        return handlePost({ text, replyToken });
      }

      if (text.includes("レシート")) {
        return handleReceipt({ text: message.id, replyToken });
      }

      if (text.includes("予定")) {
        return handleSchedule({ text, replyToken });
      }

      const intent = await classify(text);

      switch (intent) {
        case "POST":
          return handlePost({ text, replyToken });

        case "RECEIPT":
          return handleReceipt({ text: message.id, replyToken });

        case "SCHEDULE":
          return handleSchedule({ text, replyToken });

        default:
          return handleChat({ text, replyToken });
      }
    }

    // IMAGE
    if (message.type === "image") {
      return handleReceipt({ text: message.id, replyToken });
    }
  } catch (err) {
    console.error("dispatcher error:", err);
  }
}

module.exports = dispatcher;

