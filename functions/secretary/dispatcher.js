// secretary/dispatcher.js
// 2026/05/03

const axios = require("axios");

// ❌ ここで直接読み込まない（重要）
let handleOCR;

// ================================
// 📥 画像取得
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
// 🚀 dispatcher
// ================================
async function dispatcher(event) {
  try {
    console.log("📥 stream event:", event.message.type);

    // 👇 ここで初めて読み込む（遅延ロード）
    if (!handleOCR) {
      handleOCR = require("../handlers/ocrHandler").handleOCR;
    }

    if (event.message.type === "image") {
      console.log("🖼 OCR direct pipeline start");

      const imageBuffer = await downloadLineImage(event.message.id);

      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      return await handleOCR(imageBuffer);
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

module.exports = { dispatcher };
