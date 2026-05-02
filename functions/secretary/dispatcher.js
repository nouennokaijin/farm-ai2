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
const { handleOCR } = require("../handlers/ocrHandler"); // OCR追加

// ================================
// AIクライアント
// ================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 状態管理
// ================================
const pendingImageMap = new Map(); // 直前画像
const sessionMap = new Map();      // xポセッション

const IMAGE_TTL = 60 * 1000;
const SESSION_TTL = 5 * 60 * 1000;

// ================================
// 🧠 AI分類（最後の砦）
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
// dispatcher本体
// ================================
async function dispatcher(event) {
  try {
    if (!event || event.type !== "message") return;

    const message = event.message;
    const replyToken = event.replyToken;
    const userId = event.source?.userId;

    if (!message || !replyToken || !userId) return;

    console.log("📥 dispatch:", message.type);

    // ================================
    // 🎥 video無視
    // ================================
    if (message.type === "video") return;

    // ================================
    // 📎 file → とりあえずpost
    // ================================
    if (message.type === "file") {
      return handlePost({
        text: "ファイル受信",
        fileIds: [message.id],
        replyToken,
      });
    }

    // ================================
    // 🖼️ image単体は保留
    // ================================
    if (message.type === "image") {
      const session = sessionMap.get(userId);

      // セッション中なら画像を蓄積
      if (session && session.active) {
        session.images.push(message.id);
        return;
      }

      // 単発画像はpendingへ
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

      // 軽い正規化（OCR誤認対策）
      const text = rawText.replace(/\s/g, "");

      // ================================
      // 🧭 セッション開始
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

      // ================================
      // 🧭 セッション中
      // ================================
      if (session && session.active) {
        if (Date.now() - session.startedAt > SESSION_TTL) {
          sessionMap.delete(userId);
          console.log("⏱ session timeout");
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
      // 🖼️ pending画像取得
      // ================================
      const pending = pendingImageMap.get(userId);

      // ================================
      // ⭐ 明示ルール（最優先）
      // ================================

      // 🧾 レシート
      if (text.includes("レシート")) {
        return handleReceipt({ text: rawText, replyToken });
      }

      // 📝 投稿
      if (text.includes("投稿")) {
        return handlePost({ text: rawText, replyToken });
      }

      // 📅 予定
      if (text.includes("予定")) {
        return handleSchedule({ text: rawText, replyToken });
      }

      // 📖 OCR（明示）
      if (
        text.includes("OCR") ||
        text.includes("ocr") ||
        text.includes("ＯＣＲ") ||
        text.includes("ｏｃｒ")
      ) {
        if (pending && Date.now() - pending.timestamp < IMAGE_TTL) {
          pendingImageMap.delete(userId);

          console.log("➡️ OCR Handler（画像付き）");
          return handleOCR({
            text: rawText,
            imageIds: [pending.imageId],
            replyToken,
          });
        }

        console.log("➡️ OCR Handler（テキストのみ）");
        return handleOCR({
          text: rawText,
          replyToken,
        });
      }

      // ================================
      // 🖼️＋📝 通常結合（post）
      // ================================
      if (pending && Date.now() - pending.timestamp < IMAGE_TTL) {
        pendingImageMap.delete(userId);

        return handlePost({
          text: rawText,
          imageIds: [pending.imageId],
          replyToken,
        });
      }

      // ================================
      // 🤖 AI分類（最後）
      // ================================
      const intent = await classify(rawText);

      switch (intent) {
        case "POST":
          return handlePost({ text: rawText, replyToken });

        case "RECEIPT":
          return handleReceipt({ text: rawText, replyToken });

        case "SCHEDULE":
          return handleSchedule({ text: rawText, replyToken });

        case "OCR":
          // AI判断でOCRに振り分け
          if (pending && Date.now() - pending.timestamp < IMAGE_TTL) {
            pendingImageMap.delete(userId);

            console.log("🤖 OCR Handler（AI判定・画像付き）");
            return handleOCR({
              text: rawText,
              imageIds: [pending.imageId],
              replyToken,
            });
          }

          console.log("🤖 OCR Handler（AI判定・テキストのみ）");
          return handleOCR({
            text: rawText,
            replyToken,
          });

        default:
          return handleChat({ text: rawText, replyToken });
      }
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

module.exports = dispatcher;
