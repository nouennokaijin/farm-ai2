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
const { handleOCR } = require("../handlers/ocrHandler");

// 🧠 新規：学習ログ
const { logUnclassified } = require("../utils/chatLogger");

// ================================
// AIクライアント
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 超短命ストリームバッファ
// ================================
const streamBuffer = new Map();
const STREAM_TTL = 10 * 1000;

// ================================
// AI分類
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
            "POST / RECEIPT / SCHEDULE / OCR / CHAT のいずれか1語だけ返す。不明はCHAT。",
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
// ストリーム統合
// ================================
function mergeStream(userId, incoming) {
  const prev = streamBuffer.get(userId);

  if (!prev) {
    const created = { ...incoming, createdAt: Date.now() };
    streamBuffer.set(userId, created);
    return created;
  }

  if (Date.now() - prev.createdAt > STREAM_TTL) {
    streamBuffer.set(userId, incoming);
    return incoming;
  }

  const merged = {
    userId,
    type: "stream",
    text: `${prev.text || ""} ${incoming.text || ""}`.trim(),
    images: [...(prev.images || []), ...(incoming.images || [])],
    createdAt: Date.now(),
  };

  streamBuffer.set(userId, merged);
  return merged;
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

    console.log("📥 stream event:", message.type);

    // ================================
    // 正規化
    // ================================
    const incoming = {
      userId,
      text: message.text || "",
      images: message.type === "image" ? [message.id] : [],
      createdAt: Date.now(),
    };

    // ================================
    // ストリーム統合
    // ================================
    const state = mergeStream(userId, incoming);
    const text = (state.text || "").replace(/\s/g, "");

    // ================================
    // ⭐ 明示ルール
    // ================================
    if (text.includes("レシート")) {
      streamBuffer.delete(userId);
      return handleReceipt({ text, replyToken });
    }

    if (text.includes("投稿")) {
      streamBuffer.delete(userId);
      return handlePost({
        text,
        imageIds: state.images,
        replyToken,
      });
    }

    if (
      text.includes("OCR") ||
      text.includes("ocr") ||
      text.includes("ＯＣＲ")
    ) {
      streamBuffer.delete(userId);
      return handleOCR({
        text,
        imageIds: state.images,
        replyToken,
      });
    }

    // ================================
    // 🧠 AI分類
    // ================================
    const intent = await classify(text);

    switch (intent) {
      case "POST":
        streamBuffer.delete(userId);
        return handlePost({
          text,
          imageIds: state.images,
          replyToken,
        });

      case "RECEIPT":
        streamBuffer.delete(userId);
        return handleReceipt({ text, replyToken });

      case "SCHEDULE":
        streamBuffer.delete(userId);
        return handleSchedule({ text, replyToken });

      case "OCR":
        streamBuffer.delete(userId);
        return handleOCR({
          text,
          imageIds: state.images,
          replyToken,
        });

      // ================================
      // 🧠 ここが核心：学習ルート
      // ================================
      default:
        console.log("🧠 fallback → learning capture");

        // ① 学習ログに保存（重要）
        await logUnclassified({
          text,
          state,
          reason: "NO_INTENT_MATCH",
        });

        // ② ユーザーにはChat応答
        return handleChat({
          text,
          replyToken,
          state, // 文脈も渡す（進化ポイント）
        });
    }

  } catch (err) {
    console.error("🔥 stream dispatcher error:", err);
  }
}

module.exports = dispatcher;
