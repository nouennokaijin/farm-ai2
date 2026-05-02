// handlers/postHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

// ================================
// Cloudinary
// ================================
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");

// ================================
// LINE画像取得
// ================================
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// OCR
// ================================
const { extractTextFromImage } = require("../utils/ocr");

// ================================
// Groq AI
// ================================
const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 AI関数
// ================================
async function generateText(prompt) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return res.choices[0].message.content.trim();

  } catch (err) {
    console.error("generateText error:", err);
    return "（AI生成エラー）";
  }
}

// ================================
// Vision風生成
// ================================
async function generateVisionText({ prompt, images = [] }) {
  const imageInfo = images.length
    ? `\n画像URL:\n${images.join("\n")}`
    : "";

  return generateText(prompt + imageInfo);
}

// ================================
// 🌱 基本理念
// ================================
const baseConcept = `
便利すぎる世界で、
人は少しだけ弱くなった気がする。
ボタンひとつで何でもできるけど、
手で触れることを大切にしたい。
`;

// ================================
// 🎯 人格
// ================================
const corePrompt = `
あなたは自然と手仕事を大切にする書き手。
X投稿用に128〜138文字で出力。
`;

// ================================
// 📌 投稿処理
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("📝 handlePost:", text);

  try {
    const safeText = text?.trim() || "";

    // ================================
    // ☁️ upload
    // ================================
    const uploadTasks = [];

    for (const id of [...imageIds, ...fileIds]) {
      uploadTasks.push(async () => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return uploadToCloudinary(
          buffer,
          `file_${Date.now()}_${id}`,
          "farm-ai"
        );
      });
    }

    const fileUrls = (await Promise.all(uploadTasks)).filter(Boolean);

    // ================================
    // 🔍 OCR
    // ================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        const extracted = await extractTextFromImage(url);
        if (extracted) ocrText += extracted + "\n";
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    // ================================
    // 🧠 AI生成1
    // ================================
    let draft;

    if (fileUrls.length > 0) {
      draft = await generateVisionText({
        prompt: `${corePrompt}\n${baseConcept}\n${safeText}`,
        images: fileUrls,
      });
    } else {
      draft = await generateText(`${corePrompt}\n${baseConcept}\n${safeText}`);
    }

    // ================================
    // ✨ AI生成2
    // ================================
    const finalPost = await generateText(`
以下をX投稿に整形：
・138文字以内
・余韻重視

${draft}
`);

    // ================================
    // 🏷 タグ（★ここが修正ポイント）
    // ================================
    const tags = await buildTags({
      text: finalPost,
      type: "投稿"
    });

    // ================================
    // 💾 Notion
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "LINE投稿",
        userText: safeText,
        aiText: finalPost,
        ocrText,
        files: fileUrls,
        tags,
      });
    });

  } catch (err) {
    console.error("🔥 handlePost error:", err);
  }
}

module.exports = { handlePost };
