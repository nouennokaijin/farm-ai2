// handlers/postHandler.js
// 2026/5/2
// 投稿処理（画像・OCR・AI統合）

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 テキスト生成
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
    return "（AIエラー）";
  }
}

// ================================
// 📸 投稿ハンドラー
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
}) {
  try {

    const safeText = text?.trim() || "";

    // ================================
    // 📤 LINE画像 → Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      imageIds.map(async (id) => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return uploadToCloudinary(
          buffer,
          `post_${Date.now()}_${id}`, // ← 投稿専用prefix
          "farm-ai"
        );
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // 🤖 AI生成
    // ================================
    const aiText = await generateText(`
画像とテキストをもとに自然な投稿にしてください：
${safeText}
`);

    // ================================
    // 🏷 タグ（王＝type優先）
    // ================================
    const tags = await buildTags({
      text: aiText,
      type: "投稿",
    });

    // ================================
    // 🧾 Notion保存
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "LINE投稿",

        userText: safeText,
        aiText,
        files: fileUrls,

        tags,
        type: "投稿",
      });
    });

  } catch (e) {
    console.error("post handler error:", e);
  }
}

module.exports = { handlePost };
