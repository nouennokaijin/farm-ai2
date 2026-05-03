// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベント司令塔（画像 → OCR → AI）

const axios = require("axios");

// ================================
// 🧠 OCR（遅延ロード：循環参照対策）
// ================================
let handleOCR;

// ================================
// 📥 LINE画像取得
// ================================
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  return Buffer.from(res.data);
}

// ================================
// 🚀 dispatcher本体
// ================================
async function dispatcher(event) {
  try {
    console.log("📥 stream event:", event.message.type);

    // ================================
    // 🧠 OCRロード（初回のみ）
    // ================================
    if (!handleOCR) {
      handleOCR = require("../handlers/ocrHandler").handleOCR;
    }

    // ================================
    // 🖼 画像処理
    // ================================
    if (event.message.type === "image") {
      console.log("🖼 OCR pipeline start");

      const imageBuffer = await downloadLineImage(event.message.id);

      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      const result = await handleOCR(imageBuffer);

      console.log("📄 OCR RESULT:", result);

      return result;
    }

    // ================================
    // 📝 テキスト（将来用）
    // ================================
    if (event.message.type === "text") {
      console.log("📝 text:", event.message.text);
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

// ⭐ ここが超重要（関数そのままexport）
module.exports = dispatcher;
