// secretary/ocrTxtAI.js
// 2026/05/04
// 🖼 OCR＋AI分類パック
// ・画像URLを受け取る
// ・OCRでテキスト抽出
// ・AIで分類（post / receipt / schedule / ocr / chat）

// ================================
// 🧠 依存モジュール
// ================================
const { runOCR } = require("../utils/ocr");     // OCR（目）
const { classifyAI } = require("./classifyAI"); // AI（脳）

// ================================
// 🚀 メイン処理
// ================================
async function ocrTxtAI(imageUrl) {
  try {
    console.log("🖼 OCR開始:", imageUrl);

    // ① OCR
    const ocrText = await runOCR(imageUrl);
    console.log("📄 OCR結果:", ocrText);

    // ② 入力テキスト決定（保険あり）
    const inputText =
      ocrText && ocrText.length >= 5
        ? ocrText
        : "画像が送信されました";

    // ③ AI分類
    const result = await classifyAI(inputText);
    console.log("🤖 OCR→AI判定:", result);

    // ④ 最終ガード
    const valid = ["post", "receipt", "schedule", "ocr", "chat"];
    return valid.includes(result) ? result : "chat";

  } catch (err) {
    console.error("❌ ocrTxtAIエラー:", err);
    return "chat";
  }
}

// ================================
// 📤 エクスポート
// ================================
module.exports = { ocrTxtAI };
