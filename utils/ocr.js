// ========================================
// utils/ocr.js
// 2026/05/09
// 📖 OCRユーティリティ（改善版）
// Okiura Kazuo
//
// 🎯 役割
// ・画像Buffer / URL / パスをOCR
// ・日本語OCR品質改善
// ・画像前処理
// ・改行保持
// ・傾き対策
//
// ✅ 改良内容
// ・sharp前処理追加
// ・グレースケール化
// ・normalize追加
// ・sharpen追加
// ・二値化追加
// ・改行維持
// ・OCRログ追加
// ・rotateAuto追加
//
// 📦 必要package
// npm install sharp tesseract.js
//
// ========================================

// ========================================
// 📦 modules
// ========================================
const sharp =
  require("sharp");

const {
  createWorker,
} = require("tesseract.js");

// ========================================
// 🧠 OCR main
// ========================================
async function runOCR(
  input
) {

  let worker;

  try {

    console.log(
      "================================="
    );

    console.log(
      "📖 OCR ENGINE START"
    );

    console.log(
      "================================="
    );

    // ========================================
    // ⚠️ input guard
    // ========================================
    if (!input) {

      console.log(
        "⚠️ OCR input empty"
      );

      return "";
    }

    // ========================================
    // 🖼 image preprocess
    // OCR精度改善用
    // ========================================
    console.log(
      "🖼 image preprocess start"
    );

    // ========================================
    // sharpで画像改善
    // ========================================
    const processedBuffer =

      await sharp(input)

        // グレースケール化
        .grayscale()

        // コントラスト補正
        .normalize()

        // シャープ化
        .sharpen()

        // 二値化
        .threshold(150)

        // 軽いノイズ除去
        .median(1)

        // buffer化
        .toBuffer();

    console.log(
      "✅ image preprocess complete"
    );

    // ========================================
    // 🤖 create worker
    // ========================================
    console.log(
      "🤖 tesseract worker create"
    );

    // 日本語＋英語
    worker =
      await createWorker(
        "jpn+eng"
      );

    // ========================================
    // ⚙️ OCR parameter
    // ========================================
    console.log(
      "⚙️ OCR parameter setup"
    );

    // OCRパラメータ調整
    await worker.setParameters({

      // 空白維持
      preserve_interword_spaces:
        "1",

    });

    // ========================================
    // 📖 OCR execute
    // ========================================
    console.log(
      "📖 OCR recognize start"
    );

    const {
      data,
    } = await worker.recognize(

      processedBuffer,

      // rotateAuto:
      // 傾き自動補正
      {
        rotateAuto: true,
      }
    );

    console.log(
      "✅ OCR recognize complete"
    );

    // ========================================
    // 📝 raw text
    // ========================================
    let text =

      data?.text || "";

    console.log(
      "📝 OCR raw length:",
      text.length
    );

    // ========================================
    // 🧹 text normalize
    // ========================================

    // ① Windows改行統一
    text =
      text.replace(
        /\r\n/g,
        "\n"
      );

    // ② タブ・連続空白のみ圧縮
    // ⚠️ 改行は残す
    text =
      text.replace(
        /[ \t]+/g,
        " "
      );

    // ③ 改行整理
    text =
      text.replace(
        /\n{3,}/g,
        "\n\n"
      );

    // ④ trim
    text =
      text.trim();

    console.log(
      "📝 normalized length:",
      text.length
    );

    console.log(
      "📝 OCR preview:"
    );

    console.log(
      text.slice(0, 500)
    );

    // ========================================
    // ⚠️ empty OCR
    // ========================================
    if (!text) {

      console.log(
        "⚠️ OCR empty result"
      );

      return "";
    }

    // ========================================
    // ✅ complete
    // ========================================
    console.log(
      "================================="
    );

    console.log(
      "✅ OCR ENGINE COMPLETE"
    );

    console.log(
      "================================="
    );

    return text;

  } catch (err) {

    console.error(
      "❌ OCR ENGINE ERROR"
    );

    console.error(err);

    return "";

  } finally {

    // ========================================
    // 🧹 worker cleanup
    // メモリリーク対策
    // ========================================
    if (worker) {

      try {

        console.log(
          "🧹 worker terminate"
        );

        await worker.terminate();

        console.log(
          "✅ worker terminated"
        );

      } catch (e) {

        console.warn(
          "⚠️ worker terminate failed"
        );

        console.warn(e);
      }
    }
  }
}

// ========================================
// 📤 export
// ========================================
module.exports = {
  runOCR,
};
