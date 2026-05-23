// utils/downloadLineMedia.js
// 2026/5/2
// Okiura Kazuo


// =====================================
// LINE画像取得
// =====================================

const axios = require("axios");

// =====================================
// LINEメディア取得関数
// messageId からバイナリ取得 → Bufferに変換
// =====================================
async function downloadLineMedia(messageId) {
  try {
    console.log("📥 downloading LINE media:", messageId);

    const res = await axios.get(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        responseType: "arraybuffer", // ← バイナリ取得（超重要）
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    const buffer = Buffer.from(res.data);

    console.log("📦 buffer size:", buffer.length);

    return buffer;

  } catch (err) {
    console.error("🔥 LINE download error:", err.response?.data || err);
    return null;
  }
}

module.exports = { downloadLineMedia };
