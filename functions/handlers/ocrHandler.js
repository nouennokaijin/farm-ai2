// handlers/ocrHandler.js
// 2026/5/3 統合・簡略化版
// 「OCR → A/B → AI → Notion」最小構成

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 OCR（純テキスト取得）
// ================================
async function extractTextFromImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    console.error("❌ OCR input invalid:", imageUrl);
    return "";
  }

  console.log("🔍 OCR REQUEST:", imageUrl);

  try {
    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはOCRエンジンです。
画像内の文字をそのまま出力してください。

ルール：
- 改行維持
- 補完禁止
- 解釈禁止
- 出力はテキストのみ
          `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    const text = res?.choices?.[0]?.message?.content?.trim() || "";

    console.log("✅ OCR RESULT:");
    console.log(text);

    return text;

  } catch (err) {
    console.error("❌ OCR error:", err);
    return "";
  }
}

// ================================
// 🤖 AI（要約生成）
// ================================
async function generateAI(ocrText, imageDescription) {
  try {
    const input = `
【OCR結果】
${ocrText}

【画像】
${imageDescription}

ルール：
- 推測禁止
- 書かれている内容のみ整理
- 文字がない場合は「文字なし」
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

    return res?.choices?.[0]?.message?.content?.trim() || "解析失敗";

  } catch (e) {
    console.error("❌ AI error:", e);
    return "AIエラー";
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
    // 📤 画像取得 → Cloudinary
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

    console.log("📸 Uploaded URLs:", fileUrls);

    // ================================
    // 🔍 OCR（複数画像対応）
    // ================================
    let ocrText = "";

    for (const url of fileUrls) {
      const text = await extractTextFromImage(url);
      ocrText += "\n" + text;
    }

    ocrText = ocrText.trim();

    // ================================
    // 📦 A/B（ここで構造化）
    // ================================
    const A = {
      hasText: !!ocrText,
      text: ocrText || "文字なし",
    };

    const B = {
      description: fileUrls.length ? "画像あり" : "画像なし",
    };

    console.log("📦 A:", A);
    console.log("📦 B:", B);

    // ================================
    // 🤖 AI（C/D）
    // ================================
    const aiSummary = await generateAI(A.text, B.description);

    const C = {
      summary: A.hasText ? aiSummary : "文字なし",
    };

    const D = {
      summary: B.description,
    };

    console.log("🧠 C:", C);
    console.log("🧠 D:", D);

    // ================================
    // 🏷 タグ
    // ================================
    const tags = await buildTags({
      text: A.text,
      type: "OCR",
    });

    // ================================
    // 📝 Notion保存用データ
    // ================================
    const OCRprop = `${A.text}\n${B.description}`;
    const AIprop = `${C.summary}\n${D.summary}`;

    // ================================
    // 📤 保存
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
    console.error("❌ OCR handler error:", e);
  }
}

module.exports = { handleOCR };
