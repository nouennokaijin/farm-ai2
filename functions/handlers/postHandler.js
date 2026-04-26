
// postHandler.js

// postHandler.js

const { createPage } = require("../utils/notion");

async function handlePost(text, tag, client, replyToken) {
  console.log("handlePost text:", text);

  const title = "LINEからの投稿";

  const cleanText = (text || "").replace(/投稿/g, "").trim();
  const content = cleanText || "（内容なし）";

  // LINE即返信（必要なら）
  if (client && replyToken && typeof client.replyMessage === "function") {
    await client.replyMessage(replyToken, {
      type: "text",
      text: "投稿を受け付けました。",
    });
  }

  await createPage(title, content, tag);
}

module.exports = { handlePost };
