// handlers/ocrHandler.js
// 📖 OCRハンドラー（完全統一インターフェース版）
//
// 🎯 役割
// - imageBuffer or text を受け取る
// - OCR → AI要約 → Notion保存
//
// 🚨 ポイント
// - dispatcherからの入力形式に完全一致
// - 常に { text, imageBuffer, event } で受ける
// - 外部依存エラーを極力吸収

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const smartOCR = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ======================================================
// 🧠 AI要約（モデル修正済）
// ======================================================
async function generateInsight(text) {
  try {
    if (!text) return "";

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // ← 廃止モデル修正済
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "OCR内容の要約・構造化（推測禁止・事実のみ）",
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
// 📖 OCR本体
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
    // 🔍 OCR処理
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

    // 👉 fallback
    ocrText = (ocrText || text).trim();

    if (!ocrText) {
      return { ok: false, reason: "empty_result" };
    }

    // ==================================================
    // 🧠 AI要約
    // ==================================================
    const insight = await generateInsight(ocrText);

    // ==================================================
    // 🏷 タグ生成
    // ==================================================
    const tags = await buildTags({
      text: ocrText,
      type: "OCR",
    });

    // ==================================================
    // 📦 Notion保存（⚠️ プロパティ修正）
    // ==================================================
    setImmediate(() => {
      saveMsgToNotion({
        title: "OCRログ", // ← Notionのプロパティ名に合わせる
        userText: text,
        ocrText: ocrText,
        aiInsight: insight,
        tags: tags,
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

module.exports = handleOCR; // ← ここ重要（関数を直接export）
