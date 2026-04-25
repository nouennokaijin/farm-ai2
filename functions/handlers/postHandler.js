const { createPage } = require("../utils/notion");

async function handlePost(text, tag) {
  console.log("handlePost text:", text);

  const title = "LINEからの投稿";

  const cleanText = (text || "").replace("投稿", "").trim();

  await createPage(title, cleanText || "（内容なし）", tag);
}

module.exports = { handlePost };
