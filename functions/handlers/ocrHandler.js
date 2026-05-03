// handlers/ocrHandler.js
// 2026/5/2
// 📖 本・説明パンフレット専用OCRハンドラー（A/B分離設計）
//
// ルール：
// - OCRは事実（格納A）
// - AIは解釈（格納B）
// - レシート・スケジュールとは完全分離
// - dispatcherには戻らない

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

const smartOCR = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 AI（格納B生成：要約・補完）
// ================================
async function generateInsight(text) {
  try {
    if (!text) return "";

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
あなたはOCR文章の理解AIです。

役割：
- 要約
- 構造化
- 重要ポイント抽出

ルール：
- 推測禁止
- 情報追加禁止
- 原文依存
          `.trim(),
        },
        { role: "user", content: text },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("AI insight error:", e);
    return "";
  }
}

// ================================
// 📖 OCRハンドラー本体
// ================================
async function handleOCR({ text = "", imageIds = [], fileIds = [] }) {
  try {
    const allIds = [...imageIds, ...fileIds];

    // ================================
    // 🚨 入力ガード
    // ================================
    if (!text && allIds.length === 0) {
      return { ok: false, reason: "no_input" };
    }

    // ================================
    // 📤 LINE → Cloudinary
    // ================================
    const fileUrls = (
      await Promise.all(
        allIds.map(async (id) => {
          try {
            const buffer = await downloadLineMedia(id);
            if (!buffer) return null;

            const url = await uploadToCloudinary(
              buffer,
              `ocr_${Date.now()}_${id}`,
              "book-ocr"
            );

            return { id, url };
          } catch (err) {
            console.error("upload error:", id, err);
            return null;
          }
        })
      )
    ).filter(Boolean);

    // ================================
    // 🔍 OCR（格納A生成）
    // ================================
    let rawText = "";
    let ocrTextA = "";

    for (const file of fileUrls) {
      try {
        const result = await smartOCR(file.url);

        const text = result?.rawText || "";

        rawText += `\n[${file.id}]\n${text}`;
        ocrTextA += `\n[${file.id}]\n${text}`;
      } catch (err) {
        console.error("OCR error:", file.id, err);
      }
    }

    ocrTextA = (ocrTextA || text).trim();

    if (!ocrTextA) {
      return { ok: false, reason: "empty_result" };
    }

    // ================================
    // 🧠 AI処理（格納B生成）
    // ================================
    const aiInsight = await generateInsight(ocrTextA);

    // ================================
    // 🏷 タグ生成
    // ================================
    const tags = await buildTags({
      text: ocrTextA,
      type: "OCR",
    });

    // ================================
    // 📦 Notion保存（非同期）
    // ================================
    setImmediate(() => {
      saveMsgToNotion({
        title: "OCRログ（A/B分離・書籍系）",

        // 🧾 入力
        userText: text,

        // 📌 格納A：OCR原文
        ocrText: ocrTextA,

        // 🤖 格納B：AI要約
        aiInsight,

        // 📎 添付
        files: fileUrls.map(f => f.url),

        // 🏷 タグ
        tags,

        type: "OCR",
      }).catch(console.error);
    });

    // ================================
    // 📤 戻り値
    // ================================
    return {
      ok: true,
      text: ocrTextA,
      insight: aiInsight,
      tags,
    };

  } catch (e) {
    console.error("OCR handler fatal error:", e);
    return { ok: false, error: e.message };
  }
}

module.exports = { handleOCR };
