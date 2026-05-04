// utils/ocr.js
// 2026/05/04
// 🧿 OCRユーティリティ（tesseract.js）
// ・画像URL / Buffer / ローカルパスを受け取る
// ・テキスト抽出のみを行う（副作用なし）
// ・失敗時は空文字を返す

const { createWorker } = require("tesseract.js");

// ================================
// 🧠 OCR実行関数
// ================================
async function runOCR(input) {
  let worker;

  try {
    // ================================
    // ① Worker生成（日本語＋英語）
    // ================================
    worker = await createWorker("jpn+eng");

    // ================================
    // ② OCR実行
    // ================================
    const { data } = await worker.recognize(input);

    // ================================
    // ③ テキスト整形
    // ================================
    const text = (data?.text || "")
      .replace(/\s+/g, " ") // 改行・連続スペースを圧縮
      .trim();

    return text;

  } catch (err) {
    console.error("❌ OCRエラー:", err);
    return "";
  } finally {
    // ================================
    // ④ Worker解放（メモリ対策）
    // ================================
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        console.warn("⚠️ worker terminate失敗:", e);
      }
    }
  }
}

// ================================
// 📤 エクスポート
// ================================
module.exports = { runOCR };
