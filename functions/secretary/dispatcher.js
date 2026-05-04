// secretary/dispatcher.js
// 📡 司令塔（Orchestrator）
//
// 🎯 役割
// - 入力の統一
// - ルーティング
// - handlerへ“同一フォーマット”で渡す

const axios = require("axios");
const { dispatcherAI } = require("./dispatcherAI");

// ======================================================
// 🧩 Handlers（関数として統一）
// ======================================================
const chatHandler = require("../handlers/chatHandler");
const postHandler = require("../handlers/postHandler");
const receiptHandler = require("../handlers/receiptHandler");
const scheduleHandler = require("../handlers/scheduleHandler");
const ocrHandler = require("../handlers/ocrHandler"); // ← 直接関数

// ======================================================
// 🗺 ルーティングテーブル
// ======================================================
const routeMap = {
  chat: chatHandler,
  post: postHandler,
  receipt: receiptHandler,
  schedule: scheduleHandler,
  ocr: ocrHandler,
};

// ======================================================
// 📊 AIログ
// ======================================================
let aiCallCount = 0;

function logAICall(label) {
  aiCallCount++;
  console.log(`📊 AI CALL #${aiCallCount} → ${label}`);
}

// ======================================================
// 📥 LINE画像取得
// ======================================================
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  return Buffer.from(res.data);
}

// ======================================================
// 🧠 ルール判定
// ======================================================
function ruleLayer(text = "") {
  const t = (text || "").toLowerCase();

  if (t.includes("投稿") || t.includes("メモ")) return "post";
  if (t.includes("レシート") || t.includes("領収書")) return "receipt";
  if (t.includes("予定") || t.includes("スケジュール")) return "schedule";

  if (
    t.includes("ocr") ||
    t.includes("おｃｒ") ||
    t.includes("読み取り") ||
    t.includes("画像") ||
    t.includes("写真")
  ) return "ocr";

  return null;
}

// ======================================================
// 🚚 Handler実行（完全統一フォーマット）
// ======================================================
async function dispatchToHandler({ route, text, imageBuffer, event }) {
  const handler = routeMap[route];

  if (typeof handler !== "function") {
    console.warn("⚠️ Handler not found:", route);
    return null;
  }

  console.log(`🚚 HANDOFF → ${route}`);

  return await handler({
    text,
    imageBuffer,
    event,
  });
}

// ======================================================
// 🚀 dispatcher本体
// ======================================================
async function dispatcher(event) {
  try {
    if (!event?.message) return null;

    const type = event.message.type;

    console.log("📥 EVENT TYPE:", type);

    // ==================================================
    // 🖼 IMAGE
    // ==================================================
    if (type === "image") {

      const imageBuffer = await downloadLineImage(event.message.id);

      // 👉 OCRだけ先に実行（分類用）
      const ocrResult = await ocrHandler({
        imageBuffer,
        event,
      });

      const text = ocrResult?.text || "";

      let route = ruleLayer(text);

      if (!route) {
        logAICall("image fallback");

        route = await dispatcherAI({
          text: "",
          ocr: text,
        });
      }

      return await dispatchToHandler({
        route,
        text,
        imageBuffer,
        event,
      });
    }

    // ==================================================
    // 📝 TEXT
    // ==================================================
    if (type === "text") {

      const text = event.message.text;

      let route = ruleLayer(text);

      if (!route) {
        logAICall("text fallback");

        route = await dispatcherAI({
          text,
          ocr: "",
        });
      }

      return await dispatchToHandler({
        route,
        text,
        event,
      });
    }

    return null;

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
    return null;
  }
}

module.exports = { dispatcher };
