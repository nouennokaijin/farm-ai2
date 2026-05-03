// handlers/ocrHandler.js
// 2026/5/3 改良版（意図一致版）
// 「OCRは純テキストのみ」「AIは別枠」「混入禁止」

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
  // 入力チェック（ここで弾く）
  if (!imageUrl || typeof imageUrl !== "string") {
    console.error("❌ OCR input invalid:", imageUrl);
    return "";
  }

  console.log("🔍 OCR REQUEST:", imageUrl);

  try {
    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0, // ブレ防止

      messages: [
        {
          role: "system",
          content: `
あなたはOCRエンジンです。
画像内の文字を一切変更せず、そのまま出力してください。

絶対ルール：
- 補完禁止
- 解釈禁止
- 要約禁止
- 説明禁止
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
// 🤖 AI（整理のみ・創作禁止）
// ================================
async function generateAI(ocrText) {
  try {
    // OCR結果だけを入力（画像情報は渡さない）
    const input = `
以下のテキストをそのまま整形してください。

ルール：
- 内容を変更しない
- 新しい文章を作らない
- 要約しない
- 箇条書きにしない
- 改行整理のみ行う

テキスト：
${ocrText}
    `.trim();

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0, // ←創作抑制（重要）
      messages: [
        {
          role: "system",
          content: "テキスト整形ツール",
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
      const result = await extractTextFromImage(url);
      if (result) {
        ocrText += (ocrText ? "\n" : "") + result;
      }
    }

    ocrText = ocrText.trim();

    // ================================
    // 📦 A/B（内部構造用）
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
    // ⚠️ OCRが空ならAI回さない
    let C = { summary: "文字なし" };
    let D = { summary: B.description };

    if (A.hasText) {
      const aiSummary = await generateAI(A.text);
      C.summary = aiSummary;
    }

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
    // 📝 Notion保存用データ（ここが重要）
    // ================================

    // ✅ OCRは純テキストのみ（メタ情報排除）
    const OCRprop = A.text;

    // ✅ AIはAIだけ
    const AIprop = C.summary;

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
