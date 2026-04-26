
// postHandler.js

const { createPage } = require("../utils/notion");

async function handlePost(text, tag, client, replyToken) {
  console.log("handlePost text:", text);

  const cleanText = (text || "").replace(/投稿/g, "").trim();
  const content = cleanText || "（内容なし）";

  // ① まず即返信（ここが重要）
  await client.replyMessage(replyToken, {
    type: "text",
    text: "投稿を受け付けました。",
  });

  // ② Notion保存は後で実行（非同期）
  setImmediate(async () => {
    try {
      await createPage("LINEからの投稿", content, tag);
    } catch (e) {
      console.error("Notion error:", e);
    }
  });
}

module.exports = { handlePost };
