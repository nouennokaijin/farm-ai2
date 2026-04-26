// dispatcher.js
// 2026/4/25

const axios = require("axios");

const { handlePost } = require("../handlers/postHandler");
const { handleReceipt } = require("../handlers/receiptHandler");
const { handleOther } = require("../handlers/otherHandler");

const LINE_TOKEN = process.env.LINE_TOKEN;

async function dispatch(message, event) {
  const replyToken = event?.replyToken;

  if (!message || !replyToken) return;

  // 共通返信
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

  if (message.includes("投稿")) {
//    await reply("投稿を受け付けました。"); //
    await handlePost(message, "post"); // Notionだけ
    return;
  }

  if (message.includes("レシート")) {
    await handleReceipt(message);
//    await reply("レシート受け付けました。");
    return;
  }

  if (message.includes("農業")) {
 //   await reply("農業AIは未実装です🌱");
    return;
  }

  await handleOther(message);
//  await reply("処理しました");
}

module.exports = { dispatch };
