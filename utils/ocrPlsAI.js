// ========================================
// utils/ocrPlsAI.js
// 2026/05/09
// 🤖📖 OCR + AI ハイブリッド解析
// Okiura Kazuo
//
// ========================================
// 🎯 役割
// ========================================
// ・OCR.jsで文字抽出
// ・OCR結果をAIで補正
// ・画像文脈をAIで再解釈
// ・崩れたOCRを人間可読へ近づける
//
// ========================================
// ✅ 特徴
// ========================================
// ・既存 runOCR() を再利用
// ・dispatcher構造を壊さない
// ・OCR失敗時もAI補助
// ・本 / 資料 / メモ向け
//
// ========================================
// 📦 必要
// ========================================
// npm install groq-sdk
//
// ========================================



// ========================================
// 📦 modules
// ========================================

// OCR本体
const { runOCR } = require("./ocr");

// Groq SDK
const Groq = require("groq-sdk");



// ========================================
// 🤖 Groq client
// ========================================

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});



// ========================================
// 🧹 OCR text normalize
// AI投入前の軽い整理
// ========================================

function normalizeOCRText(text) {

  try {

    // 空対策
    if (!text) {
      return "";
    }

    return text

      // 連続空白整理
      .replace(/[ \t]+/g, " ")

      // 改行整理
      .replace(/\n{3,}/g, "\n\n")

      // trim
      .trim();

  } catch (e) {

    console.error(
      "❌ normalizeOCRText error"
    );

    console.error(e);

    return text || "";
  }
}



// ========================================
// 🤖 AI repair
// OCR崩壊文を可能な範囲で整理
// ========================================

async function repairOCRWithAI(ocrText) {

  try {

    // 空対策
    if (!ocrText) {
      return "";
    }

    console.log(
      "🤖 OCR AI repair start"
    );

    // ========================================
    // 🤖 AI request
    // ========================================

    const res =
      await client.chat.completions.create({

        model:
          "llama-3.3-70b-versatile",

        temperature: 0.1,

        messages: [

          {
            role: "system",

            content: `
あなたはOCR補正AIです。

目的：
OCRで崩れた日本語文章を、
可能な範囲で読みやすく整理する。

重要ルール：

- 推測しすぎない
- 読めない部分は無理に補完しない
- 意味不明部分はそのまま残す
- 改行維持
- 本文のみ返す
- 解説禁止
- 要約禁止
- JSON禁止
- markdown禁止
- 「推測ですが」等も不要

特に：

- 日本語書籍
- 哲学書
- 縦書き崩れ
- 活字崩れ

に注意してください。
            `.trim(),
          },

          {
            role: "user",
            content: ocrText,
          },

        ],
      });

    // ========================================
    // 📝 AI response
    // ========================================

    const repaired =
      res?.choices?.[0]
        ?.message?.content
        ?.trim()
      || "";

    console.log(
      "✅ OCR AI repair complete"
    );

    return repaired;

  } catch (e) {

    console.error(
      "❌ repairOCRWithAI error"
    );

    console.error(e);

    // AI失敗時はOCR原文返却
    return ocrText || "";
  }
}



// ========================================
// 📖 OCR + AI main
// ========================================

async function ocrPlsAI({

  imageBuffer = null,

  fallbackText = "",

} = {}) {

  try {

    console.log("\n");

    console.log(
      "================================="
    );

    console.log(
      "🤖📖 OCR PLUS AI START"
    );

    console.log(
      "================================="
    );



    // ========================================
    // ⚠️ input guard
    // ========================================

    if (!imageBuffer && !fallbackText) {

      console.log(
        "⚠️ no input"
      );

      return {
        ok: false,
        reason:
          "no_input",
      };
    }



    // ========================================
    // 📖 raw OCR
    // ========================================

    let rawOCR = "";

    // 画像がある場合のみOCR実行
    if (imageBuffer) {

      try {

        console.log(
          "📖 runOCR start"
        );

        rawOCR =
          await runOCR(
            imageBuffer
          );

        console.log(
          "✅ runOCR complete"
        );

      } catch (ocrErr) {

        console.error(
          "❌ runOCR error"
        );

        console.error(ocrErr);
      }
    }



    // ========================================
    // 🧹 normalize
    // ========================================

    rawOCR =
      normalizeOCRText(
        rawOCR || fallbackText
      );



    // ========================================
    // ⚠️ empty check
    // ========================================

    if (!rawOCR) {

      console.log(
        "⚠️ OCR empty"
      );

      return {
        ok: false,
        reason:
          "empty_ocr",
      };
    }



    console.log(
      "📝 raw OCR length:",
      rawOCR.length
    );



    // ========================================
    // 🤖 AI repair
    // ========================================

    const repairedText =
      await repairOCRWithAI(
        rawOCR
      );



    console.log(
      "📝 repaired length:",
      repairedText.length
    );

    console.log(
      "📝 repaired preview:"
    );

    console.log(
      repairedText.slice(0, 500)
    );



    // ========================================
    // ✅ complete
    // ========================================

    console.log(
      "================================="
    );

    console.log(
      "✅ OCR PLUS AI COMPLETE"
    );

    console.log(
      "================================="
    );



    return {

      ok: true,

      rawOCR,

      repairedText,

      length:
        repairedText.length,
    };

  } catch (e) {

    console.error(
      "❌ ocrPlsAI error"
    );

    console.error(e);

    return {

      ok: false,

      error:
        e.message,
    };
  }
}



// ========================================
// 📤 export
// ========================================

module.exports = {
  ocrPlsAI,
};
