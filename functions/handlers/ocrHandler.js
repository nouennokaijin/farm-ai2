// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 新OCRエンジン（画像→構造化テキスト）
const { smartOCR } = require("../secretary/smartOCR");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（OCR後の意味整理・要約層）
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
- 要約
- 情報の整理
- 重要ポイント抽出

※推測は禁止
※追加情報の創作禁止
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
    // 🧠 処理開始ログ（追加）
    // ================================
    console.log("🚀 OCR HANDLER START");
    console.log("📩 input text:", text);
    console.log("🖼 imageIds:", imageIds);
    console.log("📎 fileIds:", fileIds);

    // ================================
    // 📤 LINE画像取得 → Cloudinary保存
    // ================================
    const fileUrls = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        console.log("⬇️ downloading media:", id);

        const buffer = await downloadLineMedia(id);
        if (!buffer) {
          console.log("⚠️ download failed:", id);
          return null;
        }

        const url = await uploadToCloudinary(
          buffer,
          `ocr_${Date.now()}_${id}`,
          "book-ocr"
        );

        console.log("☁️ uploaded to Cloudinary:", url);
        return url;
      })
    ).then(res => res.filter(Boolean));

    console.log("📦 fileUrls:", fileUrls);

    // ================================
    // 🔍 OCR処理（複数画像対応）
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      console.log("🔍 OCR START:", url);

      const result = await smartOCR(url);

      console.log("🧾 OCR RAW RESULT:", result?.rawText);
      console.log("✨ OCR REFINED RESULT:", result?.refinedText);

      rawText += (result.rawText || "") + "\n";
      refinedText += (result.refinedText || "") + "\n";
    }

    const cleanedText = refinedText.trim() || rawText.trim();

    console.log("📄 CLEANED TEXT:", cleanedText);

    // ================================
    // 🧠 AI意味解析（要約・構造化）
    // ================================
    console.log("🤖 AI INPUT:", cleanedText);

    const aiText = await generateInsight(cleanedText);

    console.log("🧠 AI OUTPUT:", aiText);

    // ================================
    // 🏷 タグ生成（固定ルール）
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR",
    });

    console.log("🏷 TAGS:", tags);

    // ================================
    // 🧾 Notion保存（非同期書き込み）
    // ================================
    setImmediate(async () => {
      console.log("📤 SAVING TO NOTION...");

      await saveMsgToNotion({
        title: "OCRログ（強化版）",

        // ============================
        // 🧠 入力レイヤー
        // ============================
        userText: text,

        // ============================
        // 🔍 OCRレイヤー
        // ============================
        rawOCR: rawText,
        ocrText: cleanedText,

        // ============================
        // 🤖 AI要約レイヤー
        // ============================
        aiText,

        // ============================
        // 📎 画像URL
        // ============================
        files: fileUrls,

        // ============================
        // 🏷 タグ
        // ============================
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
