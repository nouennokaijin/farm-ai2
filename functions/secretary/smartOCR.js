// services/smartOCR.js
// 2026/5/3 完全構想対応版
// 「格納庫A/B生成」＋「メタ情報完全排除」

const { extractTextFromImage } = require("../utils/ocr");

// ================================
// 🧼 OCR結果の純化（最重要）
// ================================
function sanitizeOCR(result) {
  if (!result) return "";

  // 文字列
  if (typeof result === "string") return result;

  // 配列
  if (Array.isArray(result)) return result.join("\n");

  // オブジェクト → textだけ抜く（ここが核）
  if (typeof result === "object") {
    if (typeof result.text === "string") {
      return result.text;
    }
    return "";
  }

  return String(result);
}

// ================================
// 🔍 メインOCR
// ================================
async function smartOCR(imageUrl) {
  try {
    const raw = await extractTextFromImage(imageUrl);

    // 🔥 完全リセット（メタ情報排除）
    const cleanText = sanitizeOCR(raw).trim();

    // ================================
    // 📦 格納庫A/B
    // ================================
    return {
      A: {
        hasText: !!cleanText,
        text: cleanText || "文字なし",
      },
      B: {
        description: "画像あり", // ※ここは後でAI Visionに差し替え可
      },
    };

  } catch (e) {
    console.error("smartOCR error:", e);

    return {
      A: {
        hasText: false,
        text: "文字なし",
      },
      B: {
        description: "解析失敗",
      },
    };
  }
}

module.exports = {
  smartOCR,
};
