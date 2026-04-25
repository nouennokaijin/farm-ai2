
// postHandler.js

const { createPage } = require("../utils/notion");
const {
  buildMemoryContext,
  saveMemory,
} = require("../utils/brain-memory");

async function handlePost(text, tag, client, replyToken) {
  console.log("handlePost text:", text);

  const title = "LINEからの投稿";

  const cleanText = (text || "").replace(/投稿/g, "").trim();
  const content = cleanText || "（内容なし）";

  // ① Notion保存（既存）
  await createPage(title, content, tag);

  // ② AI記憶保存
  await saveMemory({
    title,
    content,
    type: "memory",
  });

  // ③ 記憶読み込み（将来AI用）
  const memory = await buildMemoryContext();

  console.log("memory context:", memory);

  // ④ LINE返信（これ追加）
  if (client && replyToken) {
    await client.replyMessage(replyToken, {
      type: "text",
      text: "投稿されました",
    });
  }
}

module.exports = { handlePost };
