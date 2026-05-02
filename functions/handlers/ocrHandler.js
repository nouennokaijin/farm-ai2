// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

// ================================
// Cloudinary
// ================================
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");

// ================================
// LINE
// ================================
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// OCR
// ================================
const { extractTextFromImage } = require("../utils/ocr");

// ================================
// Groq
// ================================
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
    console.error("generateText error:", err);
    return "（AIエラー）";
  }
}

// ================================
// テキスト整形
// ================================
function cleanText(text) {
  return (text || "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ================================
// OCR handler
// ================================
async function handleOCR({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("📖 handleOCR start");

  try {
    // ================================
    // upload
    // ================================
    const uploadTasks = [];

    for (const id of [...imageIds, ...fileIds]) {
      uploadTasks.push(async () => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return uploadToCloudinary(
          buffer,
          `ocr_${Date.now()}_${id}`,
          "book-ocr"
        );
      });
    }

    const fileUrls = (await Promise.all(uploadTasks)).filter(Boolean);

    if (fileUrls.length === 0) return;

    // ================================
    // OCR
    // ================================
    let raw = "";

    for (const url of fileUrls) {
      try {
        const t = await extractTextFromImage(url);
        if (t) raw += t + "\n";
      } catch (e) {
        console.error(e);
      }
    }

    const cleanedText = cleanText(raw);

    // ================================
    // AI
    // ================================
    const aiResult = await generateText(`
要約と感想をJSONで出力：

{
  "summary": "",
  "impression": ""
}

本文：
${cleanedText}
`);

    let summary = "";
    let impression = "";

    try {
      const json = aiResult.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(json ? json[0] : aiResult);

      summary = parsed.summary || "";
      impression = parsed.impression || "";
    } catch (e) {
      summary = aiResult;
    }

    // ================================
    // 🏷 タグ（★修正）
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR"
    });

    // ================================
    // Notion
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "OCR読書ログ",
        userText: text,
        aiText: `${summary}\n\n${impression}`,
        ocrText: cleanedText,
        files: fileUrls,
        tags,
        type: "book",
      });
    });

  } catch (err) {
    console.error("🔥 handleOCR error:", err);
  }
}

module.exports = { handleOCR };
