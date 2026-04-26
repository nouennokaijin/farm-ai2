// dispatcher.js
// 2026/4/25

const { handlePost } = require("../handlers/postHandler");
const { handleChat } = require("../handlers/chatHandler"); // 追加

function dispatch(event) {
  if (event.type !== "message") return;

  const text = event.message?.text || "";

  // 👉「投稿」がある時だけ投稿処理
  if (text.includes("投稿")) {
    return handlePost(event);
  }

  // 👉それ以外は全部チャット扱い
    return handleChat(event);
}

module.exports = { dispatch };

