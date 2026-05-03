// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（安定版）

const axios = require("axios");

// ================================
// 🧠 OCRは遅延ロード（循環参照対策）
// ================================
let handleOCR = null;

// ================================
// 📥 LINE画像取得
// ================================
/**
 * LINEのmessageIdから画像をBufferで取得
 * @param {string} messageId
 * @returns {Promise<Buffer>}
 */
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
/**
 * LINEイベントの振り分け
 * @param {object} event
 */
async function dispatcher(event) {
  try {
    // イベント防御
    if (!event || !event.message) {
      console.warn("⚠️ invalid event:", event);
      return;
    }

    console.log("📥 stream event:", event.message.type);

    // ============================
    // 🧠 OCRモジュール遅延ロード（ここが安全ポイント）
    // ============================
    if (!handleOCR) {
      const mod = require("../handlers/ocrHandler");

      // 🔥 export崩れ検知用ガード
      handleOCR = mod.handleOCR || mod.default || mod;

      if (typeof handleOCR !== "function") {
        throw new Error("OCR module is not a function. export mismatch detected.");
      }
    }

    // ============================
    // 🖼 画像処理
    // ============================
    if (event.message.type === "image") {
      console.log("🖼 OCR pipeline start");

      const imageBuffer = await downloadLineImage(event.message.id);

      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      if (!Buffer.isBuffer(imageBuffer)) {
        throw new Error("Downloaded data is not a Buffer");
      }

      const result = await handleOCR(imageBuffer);

      console.log("📄 OCR RESULT:", result);

      return result;
    }

    // ============================
    // 📝 テキスト
    // ============================
    if (event.message.type === "text") {
      console.log("📝 text:", event.message.text);
      return event.message.text;
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

// ================================
// 📤 export（統一）
// ================================
module.exports = { dispatcher };
