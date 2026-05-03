// handlers/ocrHandler.js
// 2026/5/3 改良版
// 格納庫A/B/C/Dを完全実装＋非同期安定化＋構造固定

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
async function generateInsight(structured) {
  try {
    const input = `
【OCR文字情報】
${structured.A.text}

【画像内容】
${structured.B.description}

ルール：
- 推測禁止
- 書いてあることだけ整理
- 文字がない場合は「文字なし」と明記
    `.trim();

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "あなたは情報整理AIです。要約と構造化のみ行う。",
        },
        { role: "user", content: input },
      ],
    });

    const output =
      res?.choices?.[0]?.message?.content?.trim() || "解析失敗";

    // ================================
    // 📦 格納庫C/D（固定構造）
    // ================================
    return {
      C: {
        summary: structured.A.hasText ? output : "文字なし",
      },
      D: {
        summary: structured.B.description || "画像説明なし",
      },
    };

  } catch (e) {
    console.error("AI insight error:", e);

    return {
      C: { summary: "AIエラー" },
      D: { summary: "AIエラー" },
    };
  }
}

// ================================
// 📖 OCRハンドラー本体
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
  fileIds = [],
}) {
  try {
    console.log("🚀 OCR HANDLER START");

    // ================================
    // 📤 画像取得＆アップロード
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

    console.log("📦 fileUrls:", fileUrls);

    // ================================
    // 🔍 OCR処理
    // ================================
    let rawText = "";
    let refinedText = "";

    for (const url of fileUrls) {
      const result = await smartOCR(url);

      rawText += result.rawText + "\n";
      refinedText += result.refinedText + "\n";
    }

    const cleanedText =
      rawText.trim() || refinedText.trim() || text.trim();

    // ================================
    // 📦 格納庫A/B（ここが超重要）
    // ================================
    const structured = {
      A: {
        hasText: !!cleanedText,
        text: cleanedText || "文字なし",
      },
      B: {
        description: fileUrls.length
          ? "画像あり（詳細はAI解析へ）"
          : "画像なし",
      },
    };

    console.log("📦 STRUCTURED OCR:", structured);

    // ================================
    // 🤖 AI解析（C/D生成）
    // ================================
    const aiResult = await generateInsight(structured);

    console.log("🧠 AI RESULT:", aiResult);

    // ================================
    // 🏷 タグ
    // ================================
    const tags = await buildTags({
      text: structured.A.text,
      type: "OCR",
    });

    // ================================
    // 🧾 Notion用整形
    // ================================
    const OCRprop = `${structured.A.text}\n${structured.B.description}`;
    const AIprop = `${aiResult.C.summary}\n${aiResult.D.summary}`;

    // ================================
    // 📤 Notion保存（awaitに変更 ← 超重要）
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

    console.log("✅ NOTION SAVE DONE");

  } catch (e) {
    console.error("OCR handler error:", e);
  }
}

module.exports = { handleOCR };
