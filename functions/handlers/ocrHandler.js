// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo（改良版：OCR安定化＋データ汚染防止）

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 OCRエンジン
const { smartOCR } = require("../secretary/smartOCR");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（OCR後の意味整理）
// ================================
async function generateInsight(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
あなたはOCR後の意味理解エンジンです。

役割：
- 要約
- 情報整理
- 重要ポイント抽出

※推測禁止
※創作禁止
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
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {

    // ================================
    // 🚀 START LOG
    // ================================
    console.log("🚀 OCR HANDLER START");
    console.log("📩 input text:", text);
    console.log("🖼 imageIds:", imageIds);
    console.log("📎 fileIds:", fileIds);

    // ================================
    // ⚠️ 入力チェック
    // ================================
    if ((!imageIds?.length) && (!fileIds?.length)) {
      console.warn("⚠️ no image/file input → OCR skipped possibility");
    }

    // ================================
    // 📤 LINE画像 → Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        console.log("⬇️ downloading media:", id);

        const buffer = await downloadLineMedia(id);

        if (!buffer) {
          console.warn("⚠️ download failed:", id);
          return null;
        }

        const url = await uploadToCloudinary(
          buffer,
          `ocr_${Date.now()}_${id}`,
          "book-ocr"
        );

        console.log("☁️ uploaded:", url);
        return url;
      })
    ).then(res => res.filter(Boolean));

    console.log("📦 fileUrls:", fileUrls);

    // ================================
    // ⚠️ OCR停止条件（重要）
    // ================================
    if (fileUrls.length === 0) {
      console.error("❌ OCR STOP: no valid images");
      return; // ← ここ重要（無駄AI防止）
    }

    // ================================
    // 🔍 OCR処理
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      console.log("🔍 OCR START:", url);

      const result = await smartOCR(url);

      console.log("📄 OCR RAW RESULT:", result?.rawText);
      console.log("✨ OCR REFINED RESULT:", result?.refinedText);

      if (!result?.rawText) {
        console.warn("⚠️ empty OCR result");
      }

      rawText += (result?.rawText || "") + "\n";
      refinedText += (result?.refinedText || "") + "\n";
    }

    // ================================
    // 🧠 OCR採用ロジック（修正済み）
    // ================================
    const cleanedText =
      rawText?.trim() ||
      refinedText?.trim() ||
      "";

    console.log("📄 FINAL OCR TEXT:", cleanedText);

    if (!cleanedText) {
      console.error("❌ NO OCR TEXT GENERATED");
      return;
    }

    // ================================
    // 🤖 AI解析
    // ================================
    console.log("🤖 AI INPUT:", cleanedText);

    const aiText = await generateInsight(cleanedText);

    console.log("🧠 AI OUTPUT:", aiText);

    // ================================
    // 🏷 タグ生成
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR",
    });

    console.log("🏷 TAGS:", tags);

    // ================================
    // 💾 Notion保存
    // ================================
    setImmediate(async () => {
      console.log("📤 SAVING TO NOTION...");

      await saveMsgToNotion({
        title: "OCRログ",

        userText: text,

        rawOCR: rawText,
        ocrText: cleanedText,

        aiText,
        files: fileUrls,
        tags,

        type: "OCR",
      });

      console.log("✅ NOTION SAVE DONE");
    });

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
