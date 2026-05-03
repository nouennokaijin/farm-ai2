// handlers/ocrHandler.js
// 2026/5/3 完全構想対応版
// 格納庫A/B → C/D → Notion完全連携

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

const { smartOCR } = require("../secretary/smartOCR");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🤖 AI（格納庫C/D生成）
// ================================
async function generateAI(structured) {
  try {
    const input = `
【OCR結果】
${structured.A.text}

【画像】
${structured.B.description}

ルール：
- 推測禁止
- 書かれている内容のみ整理
- 文字がない場合は「文字なし」と書く
    `.trim();

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "要約と整理のみを行うAI",
        },
        { role: "user", content: input },
      ],
    });

    const output =
      res?.choices?.[0]?.message?.content?.trim() || "解析失敗";

    // ================================
    // 📦 格納庫C/D
    // ================================
    return {
      C: {
        summary: structured.A.hasText ? output : "文字なし",
      },
      D: {
        summary: structured.B.description,
      },
    };

  } catch (e) {
    console.error("AI error:", e);

    return {
      C: { summary: "AIエラー" },
      D: { summary: "AIエラー" },
    };
  }
}

// ================================
// 📖 メイン処理
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {
    console.log("🚀 OCR HANDLER START");

    // ================================
    // 📤 画像取得→Cloudinary
    // ================================
    const fileUrls = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        const buffer = await downloadLineMedia(id);
        if (!buffer) return null;

        return await uploadToCloudinary(
          buffer,
          `ocr_${Date.now()}_${id}`,
          "book-ocr"
        );
      })
    ).then((res) => res.filter(Boolean));

    // ================================
    // 🔍 OCR（格納庫A/B生成）
    // ================================
    let A = { hasText: false, text: "文字なし" };
    let B = { description: "画像なし" };

    for (const url of fileUrls) {
      const result = await smartOCR(url);

      // 複数画像対応（上書き or 結合）
      A.text += "\n" + result.A.text;
      A.hasText = A.hasText || result.A.hasText;

      B.description = result.B.description;
    }

    const structured = { A, B };

    console.log("📦 A/B:", structured);

    // ================================
    // 🤖 AI（C/D生成）
    // ================================
    const ai = await generateAI(structured);

    console.log("🧠 C/D:", ai);

    // ================================
    // 🏷 タグ
    // ================================
    const tags = await buildTags({
      text: structured.A.text,
      type: "OCR",
    });

    // ================================
    // 🧾 Notion用
    // ================================
    const OCRprop = `${structured.A.text}\n${structured.B.description}`;
    const AIprop = `${ai.C.summary}\n${ai.D.summary}`;

    // ================================
    // 📤 保存（await必須）
    // ================================
    await saveMsgToNotion({
      title: "OCR解析",

      userText: text,

      ocrText: OCRprop,
      aiText: AIprop,

      files: fileUrls,
      tags,
      type: "OCR",
    });

    console.log("✅ DONE");

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
