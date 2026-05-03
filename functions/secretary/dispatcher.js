// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（安定強化版）

const axios = require("axios");

// ================================
// 🧠 OCR遅延ロード（循環参照対策込み）
// ================================
let handleOCR = null;

function getOCR() {
  if (!handleOCR) {
    try {
      const mod = require("../handlers/ocrHandler");

      // 複数export形式を吸収
      handleOCR = mod.handleOCR || mod.default || mod;

      if (typeof handleOCR !== "function") {
        throw new Error("OCR export is not a function");
      }

      console.log("🧠 OCR module loaded");

    } catch (err) {
      console.error("❌ OCR load failed:", err);
      throw err;
    }
  }
  return handleOCR;
}

// ================================
// 📥 LINE画像取得（強化版）
// ================================
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      timeout: 10000, // ⛑ タイムアウト追加
    });

    if (!res?.data) {
      throw new Error("No image data received");
    }

    return Buffer.from(res.data);

  } catch (err) {
    console.error("❌ LINE image download failed:", err.message);
    throw err;
  }
}

// ================================
// 🚀 dispatcher本体
// ================================
async function dispatcher(event) {
  try {
    if (!event?.message) {
      console.warn("⚠️ invalid event (no message)");
      return null;
    }

    const type = event.message.type;
    console.log("📥 stream event:", type);

    // ============================
    // 🖼 image flow
    // ============================
    if (type === "image") {
      console.log("🖼 OCR pipeline start");

      const imageBuffer = await downloadLineImage(event.message.id);

      console.log("📦 isBuffer:", Buffer.isBuffer(imageBuffer));

      if (!Buffer.isBuffer(imageBuffer)) {
        throw new Error("Invalid image buffer");
      }

      const ocr = getOCR();

      const result = await ocr({
        imageBuffer,
        userId: event.source?.userId,
        messageId: event.message.id,
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

    console.log("⚠️ unsupported message type:", type);
    return null;

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
    return null;
  }
}

module.exports = { dispatcher };
