// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（画像→OCR→AI処理の入口）

const axios = require("axios");

// ================================
// 🧠 OCR関数（遅延読み込み）
// ================================
// 循環参照・初期化順問題を避けるためにここではまだ読み込まない
let handleOCR;

// ================================
// 📥 LINE画像取得
// ================================
/**
 * LINEのmessageIdから画像を取得してBuffer化する
 * @param {string} messageId
 * @returns {Buffer}
 */
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const res = await axios.get(url, {
    responseType: "arraybuffer", // 👈 バイナリで受け取る（超重要）
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  return Buffer.from(res.data);
}

// ================================
// 🚀 メインdispatcher
// ================================
/**
 * LINEイベントを振り分ける中心ロジック
 * @param {Object} event
 */
async function dispatcher(event) {
  try {
    console.log("📥 stream event:", event.message.type);

    // ============================
    // 🧠 OCRモジュール遅延ロード
    // ============================
    // 初回呼び出し時のみ読み込む（循環参照対策）
    if (!handleOCR) {
      handleOCR = require("../handlers/ocrHandler").handleOCR;
    }

    // ============================
    // 🖼 画像処理フロー
    // ============================
    if (event.message.type === "image") {
      console.log("🖼 OCR direct pipeline start");

      // ① LINEから画像取得（messageId → Buffer）
      const imageBuffer = await downloadLineImage(event.message.id);

      // ② デバッグ（ちゃんとBufferか確認）
      console.log("isBuffer:", Buffer.isBuffer(imageBuffer));

      // ③ OCR処理へ
      const result = await handleOCR(imageBuffer);

      console.log("📄 OCR RESULT:", result);

      return result;
    }

    // ============================
    // 📝 テキストメッセージ（将来用）
    // ============================
    if (event.message.type === "text") {
      console.log("📝 text:", event.message.text);
      return;
    }

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
  }
}

// ================================
// 📤 export（ここが重要）
// ================================
// ❌ module.exports = dispatcher;  ← これはNG（呼び出し方が変わる）
//
// ⭕ 正しい形：名前付きexport
module.exports = { dispatcher };
