// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 新OCRエンジン
const { smartOCR } = require("../services/smartOCR");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（補助：構造化・要約）
// ================================
async function generateInsight(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
あなたはOCR後の意味理解エンジンです。

やること：
- 内容の要約
- 意味の整理
- 重要ポイント抽出

※推測は禁止
※情報追加禁止
          `.trim(),
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    return res?.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

// ================================
// 📖 OCRハンドラー本体（強化版）
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {

    // ================================
    // 📤 LINE画像取得 → Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return uploadToCloudinary(
          buffer,
          `ocr_${Date.now()}_${id}`,
          "book-ocr"
        );
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // 🔍 OCR（3段構造エンジン）
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      const result = await smartOCR(url);

      rawText += (result.rawText || "") + "\n";
      refinedText += (result.refinedText || "") + "\n";
    }

    const cleanedText = refinedText.trim() || rawText.trim();

    // ================================
    // 🧠 AI意味解析（補助）
    // ================================
    const insight = await generateInsight(cleanedText);

    // ================================
    // 🏷 タグ生成（王のルール固定）
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR",
    });

    // ================================
    // 🧾 Notion保存（構造化強化）
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "OCRログ（強化版）",

        // ============================
        // 🧠 レイヤー分離
        // ============================
        userText: text,         // ユーザー指示
        rawOCR: rawText,        // 生OCR
        ocrText: cleanedText,   // 補正済OCR

        // ============================
        // 🤖 AIは“意味層”
        // ============================
        aiInsight: insight,

        files: fileUrls,

        // ============================
        // 🏷 タグ（固定ルール）
        // ============================
        tags,

        type: "OCR",
      });
    });

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
