
// postHandler.js

// postHandler.js

const line = require("@line/bot-sdk");
const { saveToNotion } = require("../utils/notion");

// LINEクライアントはここで1回だけ生成（超重要）
const client = new line.Client({
  channelAccessToken: process.env.LINE_TOKEN,
});

/**
 * LINE投稿ハンドラー
 * ① LINEへ即返信
 * ② Notionへ保存
 */
async function handlePost(text, tag) {
  console.log("handlePost text:", text);
  console.log("handlePost tag:", tag);

  // ===== guard（事故防止）=====
  if (!tag) {
    console.error("tag is undefined");
    return;
  }

  const replyToken = tag.replyToken;

  if (!replyToken) {
    console.error("replyToken is missing");
    return;
  }

  // ===== ① LINE返信（最優先）=====
  try {
    await client.replyMessage(replyToken, {
      type: "text",
      text: "投稿したよ",
    });
  } catch (err) {
    console.error("LINE reply error:", err);
    // ここで止めない（Notionは動かす）
  }

  // ===== ② Notion保存（後処理）=====
  try {
    // LINE遅延防止のため非同期でもOK
    setImmediate(async () => {
      await saveToNotion(text);
      console.log("Notion saved");
    });
  } catch (err) {
    console.error("Notion error:", err);
  }
}

module.exports = { handlePost };
