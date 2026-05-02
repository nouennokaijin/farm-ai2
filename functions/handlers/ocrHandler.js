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
  } catch {
    return "";
  }
}

// ================================
// OCR
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {
    // ================================
    // upload（修正）
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
    // OCR
    // ================================
    let raw = "";

    for (const url of fileUrls) {
      const t = await extractTextFromImage(url);
      if (t) raw += t + "\n";
    }

    const cleanedText = raw.trim();

    // ================================
    // AI
    // ================================
    const ai = await generateText(`
要約と感想：
${cleanedText}
`);

    // ================================
    // TAG（ここ重要）
    // ================================
    const tags = await buildTags({
      text: cleanedText,
      type: "OCR",
    });

    // ================================
    // NOTION（type修正）
    // ================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "OCR読書ログ",
        userText: text,
        aiText: ai,
        ocrText: cleanedText,
        files: fileUrls,
        tags,
        type: "OCR",
      });
    });

  } catch (e) {
    console.error(e);
  }
}

module.exports = { handleOCR };
