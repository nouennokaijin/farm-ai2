
// postHandler.js

// const pendingMap = new Map();  //sentakuyou

const { createPage } = require("../utils/notion");
const {
  buildMemoryContext,
  saveMemory,
} = require("../utils/brain-memory");

async function handlePost(text, tag) {
  console.log("handlePost text:", text);

  const title = "LINEからの投稿";

  const cleanText = (text || "").replace(/投稿/g, "").trim();
  const content = cleanText || "（内容なし）";

  // ① 記憶を保存（Notion）
  await createPage(title, content, tag);

  // ② brain-memoryにも保存（AI用記憶）
  await saveMemory({
    title,
    content,
    type: "memory",
  });

  // ③ 必要なら記憶を取得（今はログ用）
  const memory = await buildMemoryContext();
  console.log("memory context:", memory);
}

module.exports = { handlePost };
