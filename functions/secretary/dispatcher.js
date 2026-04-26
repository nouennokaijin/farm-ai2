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

const { getIntent } = require("class-ai");

const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleSchedule } = require("../handlers/scheduleHandler");
const { handleChat } = require("../handlers/chatHandler");

async function dispatcher(event) {
  const { type, message } = event;

  if (type !== "message") return;

  // ===== テキスト =====
  if (message.type === "text") {
    const text = message.text;

    // 先に軽いルール判定（高速）
    if (text.includes("投稿")) return handlePost(text);
    if (text.includes("レシート")) return handleReceipt(text);
    if (text.includes("予定")) return handleSchedule(text);

    // AI判定
    const intent = await getIntent(text);

    switch (intent) {
      case "POST":
        return handlePost(text);

      case "RECEIPT":
        return handleReceipt(text);

      case "SCHEDULE":
        return handleSchedule(text);

      default:
        return handleChat(text);
    }
  }

  // ===== 画像 =====
  if (message.type === "image") {
    // とりあえずレシート処理に流す（後で分岐拡張OK）
    return handleReceipt(message.id);
  }
}

module.exports = { dispatcher };
