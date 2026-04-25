const { createPage } = require("../utils/notion");

async function handlePost(text, tag) {
  console.log("handlePost text:", text);

  const title = "LINEからの投稿";

  // 「投稿」だけ取り除く（前後どこにあってもOK）
  const cleanText = (text || "").replace(/投稿/g, "").trim();

  // 空ならそのまま分かるようにする
  const content = cleanText || "（内容なし）";

  // そのまま渡す
  await createPage(title, content, tag);
}

module.exports = { handlePost };
