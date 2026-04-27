// dispatcher.js
// 2026/4/25
/*
const { handlePost } = require("../handlers/postHandler");
const { handleChat } = require("../handlers/chatHandler"); // 追加

function dispatch(event) {
  if (event.type !== "message") return;

  const text = event.message?.text || "";

  // 👉「投稿」がある時だけ投稿処理
  if (text.includes("投稿")) {
    return handlePost(event);
  }

  // 👉それ以外は全部チャット扱い
    return handleChat(event);
}

module.exports = { dispatch };

*/
// dispatcher.js
// 2026/04/27

const Groq = require("groq-sdk");

// handlers
const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");

// Groq client
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===== AI分類（brain統合）=====
async function classify(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "あなたは分類AI。必ず次のいずれか1語のみ返す: POST / RECEIPT / SCHEDULE / CHAT。不明な場合はCHAT。",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || "CHAT";
  } catch (e) {
    console.error("AI classify error:", e);
    return "CHAT";
  }
}

// ===== dispatcher本体 =====
async function dispatcher(event) {
  try {
    if (!event || event.type !== "message") return;

    const message = event.message;
    const replyToken = event.replyToken;

    if (!message) return;

    // ===== テキスト =====
    if (message.type === "text") {
      const text = message.text || "";

      if (!replyToken) {
        console.warn("missing replyToken");
      }

      // ① ルール優先
      if (text.includes("投稿")) return handlePost(text, replyToken);
      if (text.includes("レシート")) return handleReceipt(text, replyToken);
      if (text.includes("予定")) return handleSchedule(text, replyToken);

      // ② AI分類
      const intent = await classify(text);

      switch (intent) {
        case "POST":
          return handlePost(text, replyToken);

        case "RECEIPT":
          return handleReceipt(text, replyToken);

        case "SCHEDULE":
          return handleSchedule(text, replyToken);

        default:
          return handleChat(text, replyToken);
      }
    }

    // ===== 画像 =====
    if (message.type === "image") {
      return handleReceipt(message.id, replyToken);
    }
  } catch (err) {
    console.error("dispatcher error:", err);
  }
}

module.exports = { dispatcher };
