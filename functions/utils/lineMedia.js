// utils/lineMedia.js

const axios = require("axios");

// ===== LINEメディアダウンロード =====
// messageIdからバイナリ取得
// 戻り値：Buffer or null
async function downloadLineMedia(messageId) {
  try {
    if (!messageId) {
      throw new Error("messageId is required");
    }

    const res = await axios.get(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        responseType: "arraybuffer", // バイナリで取得
        headers: {
 Authorization: `Bearer ${process.env.LINE_TOKEN}`,  //         Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        timeout: 15000, // ★追加：タイムアウト（ハング防止）
      }
    );

    // Buffer化（念のため明示）
    return Buffer.from(res.data);

  } catch (err) {
    console.error(
      "LINE download error:",
      err.response?.data || err.message || err
    );
    return null;
  }
}

module.exports = { downloadLineMedia };
