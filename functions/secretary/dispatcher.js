const { handlePost } = require("../handlers/postHandler");

async function dispatch(message) {
  // 投稿処理
  if (message.includes("投稿")) {
    await handlePost(message);
    return "Notionに投稿したよ📘";
  }

  // その他（仮）
  return "通常メッセージだよ";
}

module.exports = { dispatch };
