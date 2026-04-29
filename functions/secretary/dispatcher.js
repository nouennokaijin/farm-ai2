// dispatcher.js
// 2026/04/27

const Groq = require("groq-sdk");

// ===== handlers =====
const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");

// ===== Groqクライアント =====
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===== 状態管理 =====

// 直前画像（1ユーザー1枚）
const pendingImageMap = new Map();

// セッション管理（xポ〜zぽ）
const sessionMap = new Map();

// 画像→テキストの許容時間（1分）
const IMAGE_TTL = 60 * 1000;

// セッション最大時間（5分）
const SESSION_TTL = 5 * 60 * 1000;

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

// ===== dispatcher =====
async function dispatcher(event) {
  try {
    // messageイベント以外は無視
    if (!event || event.type !== "message") return;

    const message = event.message;
    const replyToken = event.replyToken;
    const userId = event.source?.userId;

    // 必須チェック
    if (!message || !replyToken || !userId) return;

    // ===== 状態ログ =====
    console.log("STATE", {
      hasPending: pendingImageMap.has(userId),
      hasSession: sessionMap.has(userId),
    });

    // =========================
    // 🎥 動画 → 完全無視
    // =========================
    if (message.type === "video") {
      return;
    }

    // =========================
    // 📎 ファイル → 即処理
    // =========================
    if (message.type === "file") {
      return handlePost({
        text: "ファイル受信",
        fileIds: [message.id],
        replyToken,
      });
    }

    // =========================
    // 🖼️ 画像処理
    // =========================
    if (message.type === "image") {
      const session = sessionMap.get(userId);

      // セッション中なら画像を蓄積
      if (session && session.active) {
        session.images.push(message.id);
        return;
      }

      // 通常モード：1枚だけ保持
      pendingImageMap.set(userId, {
        imageId: message.id,
        timestamp: Date.now(),
      });

      return;
    }

    // =========================
    // 📝 テキスト処理
    // =========================
    if (message.type === "text") {
      const text = message.text || "";

      // =========================
      // セッション開始（xポ）
      // =========================
      if (text.startsWith("xポ")) {
        sessionMap.set(userId, {
          active: true,
          texts: [],
          images: [],
          startedAt: Date.now(),
        });

        // 古い画像削除
        pendingImageMap.delete(userId);

        return;
      }

      // =========================
      // セッション中
      // =========================
      const session = sessionMap.get(userId);

      if (session && session.active) {
        // タイムアウト
        if (Date.now() - session.startedAt > SESSION_TTL) {
          sessionMap.delete(userId);
          console.log("session timeout");
        } else {
          // 終了（zぽ）
          if (text.includes("zぽ")) {
            session.texts.push(text.replace("zぽ", "").trim());

            sessionMap.delete(userId);

            return handlePost({
              text: session.texts.join("\n"),
              imageIds: session.images,
              replyToken,
            });
          }

          // 途中テキスト追加
          session.texts.push(text);
          return;
        }
      }

      // =========================
      // 🖼️＋📝（1分以内）
      // =========================
      const pending = pendingImageMap.get(userId);

      if (pending && Date.now() - pending.timestamp < IMAGE_TTL) {
        pendingImageMap.delete(userId);

        return handlePost({
          text,
          imageIds: [pending.imageId],
          replyToken,
        });
      }

      // =========================
      // 明示ルール（AI使わない）
      // =========================
      if (text.includes("投稿")) {
        return handlePost({ text, replyToken });
      }

      if (text.includes("レシート")) {
        return handleReceipt({ text, replyToken });
      }

      if (text.includes("予定")) {
        return handleSchedule({ text, replyToken });
      }

      // =========================
      // 🤖 AI分類
      // =========================
      const intent = await classify(text);

      switch (intent) {
        case "POST":
          return handlePost({ text, replyToken });

        case "RECEIPT":
          return handleReceipt({ text, replyToken });

        case "SCHEDULE":
          return handleSchedule({ text, replyToken });

        default:
          return handleChat({ text, replyToken });
      }
    }

  } catch (err) {
    console.error("dispatcher error:", err);
  }
}

module.exports = dispatcher;
