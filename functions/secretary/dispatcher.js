// secretary/dispatcher.js
// 2026/5/3 OCR単体安定版
// smartOCR完全排除

const Groq = require("groq-sdk");

// ================================
// handlers
// ================================
const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");
const { handleOCR } = require("../handlers/ocrHandler");

// 🧠 学習ログ
const { logUnclassified } = require("../utils/chatLogger");

// ❌ smartOCR削除
// const { smartOCR } = require("./smartOCR");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// ストリームバッファ
// ================================
const streamBuffer = new Map();
const STREAM_TTL = 10 * 1000;

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

    const isImage = message.type === "image";

    // ================================
    // 正規化
    // ================================
    const incoming = {
      userId,
      text: message.text || "",
      images: isImage ? [message.id] : [],
      createdAt: Date.now(),
    };

    const state = mergeStream(userId, incoming);
    const text = (state.text || "").replace(/\s/g, "");

    // ================================
    // 🧠 OCR最優先（ここを単純化）
    // ================================
    if (isImage || (state.images && state.images.length > 0)) {
      console.log("🖼 OCR direct pipeline start");

      streamBuffer.delete(userId);

      // 👉 smartOCRを通さず、そのままhandlerへ
      return handleOCR({
        text,                  // ユーザー入力（あれば）
        imageIds: state.images,
        replyToken,
      });
    }

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
    // 🧠 fallback（最低限）
    // ================================
    console.log("🧠 fallback → chat");

    await logUnclassified({
      text,
      state,
      reason: "NO_INTENT_MATCH",
    });

    return handleChat({
      text,
      replyToken,
      state,
    });

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

module.exports = dispatcher;
