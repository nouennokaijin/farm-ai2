// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// 🧠 OCRエンジン（変更：smartOCR → utils/ocr）
// ================================
const { ocr } = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（補助：意味解析）
// ================================
async function generateInsight(text) {
  if (!text) return "";

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
  } catch (e) {
    console.error("AI insight error:", e);
    return "";
  }
}

// ================================
// 📖 OCRハンドラー本体
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
        try {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToCloudinary(
            buffer,
            `ocr_${Date.now()}_${id}`,
            "book-ocr"
          );
        } catch (e) {
          console.error("upload error:", e);
          return null;
        }
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // 🔍 OCR処理
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      try {
        const result = await ocr(url);

        rawText += (result?.rawText || "") + "\n";
        refinedText += (result?.refinedText || "") + "\n";
      } catch (e) {
        console.error("OCR error:", e, url);
      }
    }

    const cleanedText = (refinedText.trim() || rawText.trim());

    // ================================
    // 🧠 AI意味解析（補助）
    // ================================
    const insight = await generateInsight(cleanedText);

    // ================================
    // 🏷 タグ生成
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR",
    });

    // ================================
    // 📦 Notion保存（非同期）
    // ================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "OCRログ（強化版）",

          userText: text,
          rawOCR: rawText,
          ocrText: cleanedText,

          aiInsight: insight,

          files: fileUrls,
          tags,

          type: "OCR",
        });
      } catch (e) {
        console.error("Notion save error:", e);
      }
    });

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
