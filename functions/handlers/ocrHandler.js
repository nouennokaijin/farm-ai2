// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");
const { extractTextFromImage } = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（補助役：要約生成のみ）
// ================================
async function generateText(prompt) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return res.choices[0].message.content.trim();
  } catch {
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
    // 📤 LINE画像 → Cloudinaryアップロード
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
    // 🔍 OCR抽出（事実データ）
    // ================================
    let raw = "";

    for (const url of fileUrls) {
      const t = await extractTextFromImage(url);
      if (t) raw += t + "\n";
    }

    const cleanedText = raw.trim();

    // ================================
    // 🤖 AI処理（補助：要約のみ）
    // ================================
    const ai = await generateText(`
以下の内容を要約し、気づきを短くまとめてください：

${cleanedText}
`);

    // ================================
    // 🏷 タグ生成（ここが設計の核心）
    // ================================
    // 🔥 重要ルール：
    // typeが存在する場合 → 分類は100%固定（AI介入なし）
    // AIはタグ決定に関与しない
    const tags = await buildTags({
      text: cleanedText,

      // ============================
      // 👑 王（最終決定権）
      // ============================
      type: "OCR",
    });

    // ================================
    // 🧾 Notion保存
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "OCR読書ログ",

        // ============================
        // 🧠 情報レイヤー分離
        // ============================

        userText: text,          // ユーザー入力（指示）
        ocrText: cleanedText,    // OCR結果（現実データ）

        // ============================
        // 🤖 AIは補助情報のみ
        // ============================
        aiText: ai,

        files: fileUrls,

        // ============================
        // 🏷 タグ（王の決定結果）
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
