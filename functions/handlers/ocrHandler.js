// handlers/ocrHandler.js
// 2026/5/2
// 📖 OCRハンドラー（関数統一版）
//
// 🎯 役割
// - 画像 or テキスト → OCR結果生成
// - AI要約生成
// - Notion保存
//
// 🚨 ルール
// - dispatcherからは「関数として直接呼ばれる」前提
// - 入力は統一オブジェクト

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const smartOCR = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ======================================================
// 🧠 AI要約
// ======================================================
async function generateInsight(text) {
  try {
    if (!text) return "";

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "OCR内容の要約・構造化（推測禁止）",
        },
        { role: "user", content: text },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("AI error:", e);
    return "";
  }
}

// ======================================================
// 📖 OCRメイン関数（dispatcher直呼び前提）
// ======================================================
async function handleOCR({ text = "", imageBuffer, event } = {}) {
  try {
    // 🚨 入力チェック
    if (!imageBuffer && !text) {
      return { ok: false, reason: "no_input" };
    }

    // 🔍 OCR処理
    let ocrText = "";

    if (imageBuffer) {
      try {
        const result = await smartOCR(imageBuffer);
        ocrText = result?.rawText || "";
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    ocrText = (ocrText || text).trim();

    if (!ocrText) {
      return { ok: false, reason: "empty_result" };
    }

    // 🧠 AI要約
    const insight = await generateInsight(ocrText);

    // 🏷 タグ生成
    const tags = await buildTags({
      text: ocrText,
      type: "OCR",
    });

    // 📦 Notion保存（非同期）
    setImmediate(() => {
      saveMsgToNotion({
        title: "OCRログ",
        userText: text,
        ocrText,
        aiInsight: insight,
        tags,
        type: "OCR",
      }).catch(console.error);
    });

    // 📤 結果返却
    return {
      ok: true,
      text: ocrText,
      insight,
      tags,
    };

  } catch (e) {
    console.error("OCR handler error:", e);
    return { ok: false, error: e.message };
  }
}

// 👉 重要：関数そのものをエクスポート
module.exports = handleOCR;
