// handlers/receiptHandler.js
// 2026/5/2
// Okiura Kazuo

const { generateReceiptTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

// =====================================
// レシート処理ハンドラー
// flow:
// dispatcher → receiptHandler → tagger → notion
// =====================================
async function handleReceipt({ text, replyToken }) {
  try {
    // ================================
    // ① テキスト安全化
    // ================================
    const safeText = text && text.trim() !== "" ? text : "（レシート内容なし）";

    // ================================
    // ② タグ生成（仕訳AI）
    // ================================
    const tags = await generateReceiptTags(safeText);

    console.log("receipt tags:", tags);

    // ================================
    // ③ Notion保存
    // ================================
    await saveMsgToNotion({
      title: "レシート",
      content: safeText,
      tags: tags,
    });

    // ================================
    // ④ LINE返信（必要なら後で有効化）
    // ================================
    /*
    if (replyToken) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: "text",
            text: "レシート保存完了🧾",
          },
        ],
      });
    }
    */

  } catch (err) {
    console.error("handleReceipt error:", err);
  }
}

module.exports = { handleReceipt };
