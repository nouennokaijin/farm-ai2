// dispatcher.js
// 2026/4/25

const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleOther } = require("../handlers/otherHandler");

async function dispatch(message, event, client) {
  const replyToken = event.replyToken;

  // ガード（安全対策）
  if (!message) {
    await client.replyMessage(replyToken, {
      type: "text",
      text: "メッセージが空です",
    });
    return;
  }

  // =========================
  // 📝 投稿系
  // =========================
  if (message.includes("投稿")) {
    await handlePost(message, "post", client, replyToken);
    return;
  }

  // =========================
  // 🧾 レシート系（画像想定は別ルートでもOK）
  // =========================
  if (message.includes("レシート")) {
    await handleReceipt(message, client, replyToken);
    return;
  }

  // =========================
  // 🌱 農業・その他AI投稿（未実装プレースホルダ）
  // =========================
  if (message.includes("農業")) {
    await client.replyMessage(replyToken, {
      type: "text",
      text: "農業AI処理はまだ未実装だよ🌱",
    });
    return;
  }

  // =========================
  // ❓ その他
  // =========================
  await handleOther(message, client, replyToken);
}

module.exports = { dispatch };
