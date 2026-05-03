// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔

const axios = require("axios");
const { handleOCR } = require("../handlers/ocrHandler");

// ================================
// 📥 LINE画像を取得する関数
// ================================
/**
 * LINEのmessageIdから画像データを取得する
 * @param {string} messageId
 * @returns {Buffer}
 */
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const res = await axios.get(url, {
    responseType: "arraybuffer", // ← これ重要（バイナリで取る）
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  // 👇 Bufferに変換（これをOCRに渡す）
  return Buffer.from(res.data);
}

// ================================
// 🚀 メインdispatcher
// ================================
/**
 * LINEイベントを振り分ける
 */
async function dispatcher(event) {
  try {
    console.log("📥 stream event:", event.message.type);

    // ============================
    // 🖼 画像の場合（ここが今回の本丸）
    // ============================
    if (event.message.type === "image") {
      console.log("🖼 OCR direct pipeline start");

      // ❗ ここが抜けてたポイント
      // message.id から画像を取得
      const imageBuffer = await downloadLineImage(event.message.id);

      // 🧪 デバッグ（ちゃんと取れてるか確認）
      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      // OCRへ渡す
      const result = await handleOCR(imageBuffer);

      console.log("OCR RESULT:", result);

      return;
    }

    // ============================
    // 📝 テキスト（仮）
    // ============================
    if (event.message.type === "text") {
      console.log("📝 text message:", event.message.text);
      return;
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

// ================================
// export
// ================================
module.exports = { dispatcher };
