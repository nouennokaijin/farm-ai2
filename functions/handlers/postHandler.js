// postHandler.js

const client = require("../utils/lineClient");
const { createPage } = require("../utils/notion");

async function handlePost({ text, replyToken }) {
  console.log("handlePost text:", text);
  console.log("replyToken:", replyToken);

  if (!replyToken) return;

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

  // Notion保存（notion.js仕様に完全一致）
  setImmediate(async () => {
    try {
      await createPage("LINE投稿", text);
      console.log("Notion saved");
    } catch (err) {
      console.error("Notion error:", err);
    }
  });
}

module.exports = { handlePost };
