// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 OCRエンジン（統一：utils配下へ移行）
const smartOCR = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（補助：意味解析・要約）
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
  } catch (e) {
    console.error("Insight generation failed:", e);
    return "";
  }
}

// ================================
// 📖 OCRハンドラー本体（改善版）
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {
    const allIds = [...imageIds, ...fileIds];

    // ================================
    // 🚨 入力ガード（無駄処理防止）
    // ================================
    if (!text && allIds.length === 0) {
      console.log("OCR skipped: no input");
      return;
    }

    // ================================
    // 📤 LINE画像取得 → Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      allIds.map(async (id) => {
        try {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return uploadToCloudinary(
            buffer,
            `ocr_${Date.now()}_${id}`,
            "book-ocr"
          );
        } catch (err) {
          console.error("Media upload failed:", id, err);
          return null;
        }
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // 🔍 OCR処理（統一エンジン）
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      try {
        const result = await smartOCR(url);

        rawText += (result?.rawText || "") + "\n";
        refinedText += (result?.refinedText || "") + "\n";
      } catch (err) {
        console.error("OCR failed for:", url, err);
      }
    }

    const cleanedText = (refinedText || rawText).trim();

    if (!cleanedText && !text) {
      console.log("OCR result empty");
      return;
    }

    // ================================
    // 🧠 AI意味解析（補助レイヤー）
    // ================================
    const insight = await generateInsight(cleanedText || text);

    // ================================
    // 🏷 タグ生成（ルールベース）
    // ================================
    const tags = await buildTags({
      text: cleanedText || text,
      type: "OCR",
    });

    // ================================
    // 📦 Notion保存（非同期・非ブロッキング）
    // ================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "OCRログ（強化版）",

          // 🧠 入力層
          userText: text,

          // 🔍 OCR層
          rawOCR: rawText,
          ocrText: cleanedText,

          // 🤖 意味層
          aiInsight: insight,

          // 📎 添付
          files: fileUrls,

          // 🏷 メタ情報
          tags,
          type: "OCR",
        });
      } catch (err) {
        console.error("Notion save failed:", err);
      }
    });

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
