// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（安定版）

const axios = require("axios");

// ================================
// 🧠 OCRは遅延ロード（循環参照対策の最終形）
// ================================
let handleOCR = null;

/**
 * OCRモジュールを安全にロード
 */
function getOCR() {
  if (!handleOCR) {
    const mod = require("../handlers/ocrHandler");

    // どのexport形式でも吸収する防御設計
    handleOCR = mod.handleOCR || mod.default;

    if (typeof handleOCR !== "function") {
      throw new Error("OCR module export is invalid (not a function)");
    }
  }
  return handleOCR;
}

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
    if (!event?.message) {
      console.warn("⚠️ invalid event");
      return;
    }

    const type = event.message.type;
    console.log("📥 stream event:", type);

    // ============================
    // 🖼 image flow
    // ============================
    if (type === "image") {
      console.log("🖼 OCR pipeline start");

      const imageBuffer = await downloadLineImage(event.message.id);

      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      if (!Buffer.isBuffer(imageBuffer)) {
        throw new Error("Invalid image buffer");
      }

      const ocr = getOCR();
      const result = await ocr({
        imageBuffer, // ← 明示的に渡す
      });

      console.log("📄 OCR RESULT:", result);

      return result;
    }

    // ============================
    // 📝 text flow
    // ============================
    if (type === "text") {
      console.log("📝 text:", event.message.text);
      return event.message.text;
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

module.exports = { dispatcher };
