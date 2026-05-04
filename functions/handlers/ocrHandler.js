// handlers/ocrHandler.js
// 2026/5/2
// 📖 OCRハンドラー（A/B分離設計）

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
// 🧠 AI要約生成
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
          content: "OCR内容の要約・構造化・重要抽出のみ（推測禁止）",
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
// 📖 OCR handler本体
// ======================================================
async function handleOCR({ text = "", imageIds = [], fileIds = [] }) {
  try {
    const allIds = [...imageIds, ...fileIds];

    if (!text && allIds.length === 0) {
      return { ok: false, reason: "no_input" };
    }

    // ==================================================
    // 📤 upload
    // ==================================================
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
            console.error("upload error:", err);
            return null;
          }
        })
      )
    ).filter(Boolean);

    // ==================================================
    // 🔍 OCR
    // ==================================================
    let ocrText = "";

    for (const file of fileUrls) {
      try {
        const result = await smartOCR(file.url);
        const t = result?.rawText || "";
        ocrText += `\n[${file.id}]\n${t}`;
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    ocrText = (ocrText || text).trim();

    if (!ocrText) {
      return { ok: false, reason: "empty_result" };
    }

    // ==================================================
    // 🧠 AI
    // ==================================================
    const insight = await generateInsight(ocrText);

    // ==================================================
    // 🏷 tags
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
        files: fileUrls.map(f => f.url),
        tags,
        type: "OCR",
      }).catch(console.error);
    });

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
