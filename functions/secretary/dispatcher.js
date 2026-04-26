// dispatcher.js
// 2026/4/25

const axios = require("axios");

const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleOther } = require("../handlers/otherHandler");

async function dispatch(message, event, LINE_TOKEN) {
  const replyToken = event?.replyToken;

  // ガード
  if (!message || !replyToken) {
    console.error("Missing message or replyToken");
    return;
  }

  // LINE返信関数（共通化）
  const reply = async (text) => {
    await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken,
        messages: [{ type: "text", text }],
      },
      {
        headers: {
          Authorization: `Bearer ${LINE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  };

  // =========================
  // 📝 投稿
  // =========================
  if (message.includes("投稿")) {
    await handlePost(message, "post", replyToken);

    await reply("投稿を受け付けました。");
    return;
  }

  // =========================
  // 🧾 レシート（未実装）
  // =========================
  if (message.includes("レシート")) {
    await handleReceipt(message, replyToken);

    await reply("レシート処理を受け付けました。");
    return;
  }

  // =========================
  // 🌱 農業AI（未実装）
  // =========================
  if (message.includes("農業")) {
    await reply("農業AIはまだ未実装です🌱");
    return;
  }

  // =========================
  // 🧠 その他
  // =========================
  await handleOther(message, replyToken);

  await reply("処理しました");
}

module.exports = { dispatch };
