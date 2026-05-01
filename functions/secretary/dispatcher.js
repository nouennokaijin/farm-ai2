// secretary/dispatcher.js
// 2026/5/2
// Okiura kazuo

const Groq = require("groq-sdk");

// ================================
// handlers
// ================================
const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");

// ================================
// AIクライアント
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 状態管理
// ================================
const pendingImageMap = new Map();
const sessionMap = new Map();

const IMAGE_TTL = 60 * 1000;
const SESSION_TTL = 5 * 60 * 1000;

// ================================
// 🧠 AI分類
// ================================
async function classify(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "POST / RECEIPT / SCHEDULE / CHAT のいずれか1語だけ返す。不明はCHAT。",
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

// ================================
// dispatcher本体
// ================================
async function dispatcher(event) {
  try {
    if (!event || event.type !== "message") return;

    const message = event.message;
    const replyToken = event.replyToken;
    const userId = event.source?.userId;

    if (!message || !replyToken || !userId) return;

    console.log("STATE", {
      hasPending: pendingImageMap.has(userId),
      hasSession: sessionMap.has(userId),
    });

    // ================================
    // 🎥 video無視
    // ================================
    if (message.type === "video") return;

    // ================================
    // 📎 file → post処理
    // ================================
    if (message.type === "file") {
      return handlePost({
        text: "ファイル受信",
        fileIds: [message.id],
        replyToken,
      });
    }

    // ================================
    // 🖼️ image処理
    // ================================
    if (message.type === "image") {
      const session = sessionMap.get(userId);

      if (session && session.active) {
        session.images.push(message.id);
        return;
      }

      pendingImageMap.set(userId, {
        imageId: message.id,
        timestamp: Date.now(),
      });

      return;
    }

    // ================================
    // 📝 text処理
    // ================================
    if (message.type === "text") {
      const rawText = message.text || "";

      // ================================
      // 軽い正規化（OCR対策）
      // ================================
      const text = rawText.replace(/\s/g, ""); // スペース除去

      // ================================
      // セッション開始
      // ================================
      if (text.startsWith("xポ")) {
        sessionMap.set(userId, {
          active: true,
          texts: [],
          images: [],
          startedAt: Date.now(),
        });

        pendingImageMap.delete(userId);
        return;
      }

      const session = sessionMap.get(userId);

      if (session && session.active) {
        if (Date.now() - session.startedAt > SESSION_TTL) {
          sessionMap.delete(userId);
          console.log("session timeout");
        } else {
          if (text.includes("zぽ")) {
            session.texts.push(text.replace("zぽ", "").trim());

            sessionMap.delete(userId);

            return handlePost({
              text: session.texts.join("\n"),
              imageIds: session.images,
              replyToken,
            });
          }

          session.texts.push(text);
          return;
        }
      }

      // ================================
      // 🖼️＋📝短期結合
      // ================================
      const pending = pendingImageMap.get(userId);

      if (pending && Date.now() - pending.timestamp < IMAGE_TTL) {
        pendingImageMap.delete(userId);

        return handlePost({
          text,
          imageIds: [pending.imageId],
          replyToken,
        });
      }

      // ================================
      // 明示ルール（最重要）
      // ================================
      // 👉 レシートは“単語1つで確実に入る”
      if (text.includes("レシート")) {
        return handleReceipt({ text: rawText, replyToken });
      }

      if (text.includes("投稿")) return handlePost({ text: rawText, replyToken });
      if (text.includes("予定")) return handleSchedule({ text: rawText, replyToken });

      // ================================
      // 🤖 AI分類（補助）
      // ================================
      const intent = await classify(rawText);

      switch (intent) {
        case "POST":
          return handlePost({ text: rawText, replyToken });

        case "RECEIPT":
          return handleReceipt({ text: rawText, replyToken });

        case "SCHEDULE":
          return handleSchedule({ text: rawText, replyToken });

        default:
          return handleChat({ text: rawText, replyToken });
      }
    }

  } catch (err) {
    console.error("dispatcher error:", err);
  }
}

module.exports = dispatcher;
