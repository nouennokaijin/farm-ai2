// secretary/dispatcher.js
// 2026/5/2
// Okiura Kazuo

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

// 🖼 smart OCR（追加）
const { smartOCR } = require("../services/smartOCR");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// AIクライアント
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// ストリームバッファ
// ================================
const streamBuffer = new Map();
const STREAM_TTL = 10 * 1000;

// ================================
// AI分類
// ================================
async function classify(text, hasImage = false) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: hasImage
            ? "POST / RECEIPT / SCHEDULE / OCR / CHAT のいずれか1語。画像ありはOCR優先。不明はOCRかCHAT。"
            : "POST / RECEIPT / SCHEDULE / OCR / CHAT のいずれか1語。不明はCHAT。",
        },
        { role: "user", content: text || "image_input" },
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
    // 🧠 画像判定（超重要）
    // ================================
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

    // ================================
    // ストリーム統合
    // ================================
    const state = mergeStream(userId, incoming);
    const text = (state.text || "").replace(/\s/g, "");

    // ================================
    // 🧠 OCR：最優先ルート（人間視覚処理）
    // ================================
    if (isImage || (state.images && state.images.length > 0)) {
      console.log("🖼 smart OCR pipeline start");

      streamBuffer.delete(userId);

      try {
        // ① LINE画像取得
        const buffer = await downloadLineMedia(state.images[0]);

        // ② 前処理 + OCR + AI補正
        const { rawText, refinedText } = await smartOCR(buffer);

        // ③ OCRハンドラへ
        return handleOCR({
          text: refinedText || rawText,
          rawText,
          imageIds: state.images,
          replyToken,
        });

      } catch (e) {
        console.error("OCR pipeline error:", e);

        return handleChat({
          text: "画像の読み取りに失敗しました",
          replyToken,
          state,
        });
      }
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
    // 🧠 AI分類
    // ================================
    const intent = await classify(text, isImage);

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
      // 🧠 学習ルート
      // ================================
      default:
        console.log("🧠 fallback → learning capture");

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
    }

  } catch (err) {
    console.error("🔥 stream dispatcher error:", err);
  }
}

module.exports = dispatcher;
