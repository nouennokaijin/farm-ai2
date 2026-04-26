
// postHandler.js

// postHandler.js

const { saveToNotion } = require("../utils/notion");
const line = require("@line/bot-sdk");

const client = require("../utils/lineClient");
//const client = new line.messagingApi.MessagingApiClient({
//  channelAccessToken: process.env.LINE_TOKEN,
//});

async function handlePost(event) {
  const text = event.message?.text || "";
  const replyToken = event.replyToken;

  console.log("handlePost text:", text);
  console.log("replyToken:", replyToken);

  if (!replyToken) {
    console.error("replyToken is missing");
    return;
  }

  // LINE返信
  try {
    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text: "投稿したよ",
        },
      ],
    });
  } catch (err) {
    console.error("LINE reply error:", err);
  }

  // Notion保存（非同期）
  setImmediate(async () => {
    try {
      await saveToNotion(text);
      console.log("Notion saved");
    } catch (err) {
      console.error("Notion error:", err);
    }
  });
}

module.exports = { handlePost };
