// handlers/ocrHandler.js
// 2026/5/2
// 📖 OCRハンドラー（完全入力統一版）
//
// 🎯 役割
// - 画像 → OCR抽出
// - AI要約生成
// - Notion保存
//
// 🚨 重要
// - dispatcherから渡される形式に完全依存しない
// - 入力はすべて統一オブジェクトで受ける

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");
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
// 📖 OCR handler本体（統一入力）
// ======================================================
async function handleOCR({ text = "", imageBuffer, event }) {
  try {

    // ==================================================
    // 🚨 入力チェック
    // ==================================================
    if (!imageBuffer && !text) {
      return { ok: false, reason: "no_input" };
    }

    // ==================================================
    // 🔍 OCR実行
    // ==================================================
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

    // ==================================================
    // 🧠 AI要約
    // ==================================================
    const insight = await generateInsight(ocrText);

    // ==================================================
    // 🏷 タグ
    // ==================================================
    const tags = await buildTags({
      text: ocrText,
      type: "OCR",
    });

    // ==================================================
    // 📦 Notion保存（非同期）
    // ==================================================
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

    // ==================================================
    // 📤 戻り値
    // ==================================================
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

module.exports = { handleOCR };
