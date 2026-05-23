// utils/chatLogger.js
// 2026/5/2
// Okiura kazuo

const { saveMsgToNotion } = require("./saveMsgToNotion");

// ================================
// 🧠 未分類ログ保存（学習データ化）
// ================================
async function logUnclassified({ text, state, reason = "UNKNOWN" }) {
  try {

    // ================================
    // 📦 ログの目的
    // ================================
    // これは「失敗ログ」ではなく「学習素材」
    // 将来的にルール生成・分類改善に使う

    const payload = {
      title: "UNCLASSIFIED_EVENT",

      // ユーザー入力そのもの
      userText: text,

      // ストリーム状態（文脈）
      context: {
        text: state?.text || "",
        images: state?.images || [],
        createdAt: state?.createdAt,
      },

      // メタ情報（なぜ分類できなかったか）
      meta: {
        reason,
        timestamp: Date.now(),
      },

      // タイプ固定（学習用）
      type: "LEARNING",
    };

    await saveMsgToNotion(payload);

    console.log("🧠 logged unclassified event");

  } catch (err) {
    console.error("🔥 chatLogger error:", err);
  }
}

module.exports = {
  logUnclassified,
};
