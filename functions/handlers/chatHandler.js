// chatHandler


const client = require("../utils/lineClient");

async function handleChat(event) {
  const replyToken = event.replyToken;
  const text = event.message?.text || "";

  console.log("chat:", text);

  if (!replyToken) return;

  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: `💬チャットだよ\n\n${text}`,
      },
    ],
  });
}

module.exports = { handleChat };
