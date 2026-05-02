// handlers/postHandler.js
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
// AI
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
    console.error(err);
    return "（AIエラー）";
  }
}

// ================================
// Vision風
// ================================
async function generateVisionText({ prompt, images = [] }) {
  const img = images.length ? `\n${images.join("\n")}` : "";
  return generateText(prompt + img);
}

// ================================
// 投稿
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  try {
    const safeText = text?.trim() || "";

    // ================================
    // upload（修正済み）
    // ================================
    const fileUrls = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return uploadToCloudinary(
          buffer,
          `file_${Date.now()}_${id}`,
          "farm-ai"
        );
      })
    ).then(res => res.filter(Boolean));

    // ================================
    // OCR
    // ================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        const t = await extractTextFromImage(url);
        if (t) ocrText += t + "\n";
      } catch {}
    }

    // ================================
    // AI
    // ================================
    const draft = await generateVisionText({
      prompt: `${safeText}`,
      images: fileUrls,
    });

    const finalPost = await generateText(`
138文字以内で整形：
${draft}
`);

    // ================================
    // 🏷 TAG
    // ================================
    const tags = await buildTags({
      text: finalPost,
      type: "投稿",
    });

    // ================================
    // NOTION
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

  } catch (e) {
    console.error(e);
  }
}

module.exports = { handlePost };
