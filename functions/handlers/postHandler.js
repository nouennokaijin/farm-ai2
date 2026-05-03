// handlers/postHandler.js
// 2026/5/2
// 投稿処理（OCR統合・AI生成・画像対応強化版）

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 OCRエンジン（統一済み想定）
const ocr = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI生成（投稿構築）
// ================================
async function generateText(prompt) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
あなたはSNS投稿生成AIです。

ルール：
- OCR情報が含まれる場合、それを最優先で意味解釈する
- 自然な日本語に変換
- 事実改変は禁止
- 読みやすく簡潔にまとめる
          `.trim(),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return res?.choices?.[0]?.message?.content?.trim() || "（生成失敗）";
  } catch (e) {
    console.error("AI generation error:", e);
    return "（AIエラー）";
  }
}

// ================================
// 📸 投稿ハンドラー（OCR統合版）
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
}) {
  try {

    const safeText = text?.trim() || "";

    // ================================
    // 🚨 入力ガード
    // ================================
    if (!safeText && imageIds.length === 0) {
      console.log("post skipped: empty input");
      return;
    }

    // ================================
    // 📤 LINE画像 → Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      imageIds.map(async (id) => {
        try {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToCloudinary(
            buffer,
            `post_${Date.now()}_${id}`,
            "farm-ai"
          );
        } catch (err) {
          console.error("image upload failed:", id, err);
          return null;
        }
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // 🔍 OCR処理（画像→テキスト化）
    // ================================
    let ocrText = "";

    if (fileUrls.length > 0) {
      for (const url of fileUrls) {
        try {
          const result = await ocr(url);
          ocrText += (result?.refinedText || result?.rawText || "") + "\n";
        } catch (err) {
          console.error("OCR failed:", url, err);
        }
      }
    }

    const combinedText = `
${safeText}

${ocrText}
    `.trim();

    // ================================
    // 🤖 AI投稿生成（統合入力）
    // ================================
    const aiText = await generateText(`
以下の情報をもとに自然なSNS投稿を作成してください。

# 入力情報
${combinedText}
`);

    // ================================
    // 🏷 タグ生成
    // ================================
    const tags = await buildTags({
      text: aiText,
      type: "投稿",
    });

    // ================================
    // 📦 Notion保存
    // ================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "LINE投稿（OCR統合）",

          userText: safeText,

          // 🧠 OCRログも保存
          ocrText,

          aiText,
          files: fileUrls,

          tags,
          type: "投稿",
        });
      } catch (err) {
        console.error("Notion save failed:", err);
      }
    });

  } catch (e) {
    console.error("post handler error:", e);
  }
}

module.exports = { handlePost }
