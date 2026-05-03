// handlers/ocrHandler.js
// 2026/5/3 Tesseract版（完全置換）
// 「純OCR（機械）＋AI整形分離」構造

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// 🧠 OCRエンジン（Tesseract）
const Tesseract = require("tesseract.js");

// 🤖 AI（整形用）
const Groq = require("groq-sdk");
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


// ================================
// 🧠 OCR（Tesseract：純機械抽出）
// ================================
async function extractTextFromBuffer(buffer) {
  try {
    if (!buffer) {
      console.error("❌ OCR buffer invalid");
      return "";
    }

    console.log("🔍 OCR START (Tesseract)");

    // ================================
    // 🧠 OCR実行
    // ================================
    const result = await Tesseract.recognize(
      buffer,
      "jpn+eng", // 日本語＋英語（安定）
      {
        logger: (m) => {
          // デバッグ用進行ログ（重いなら消してOK）
          if (m.status === "recognizing text") {
            console.log("⏳ OCR:", Math.floor(m.progress * 100) + "%");
          }
        },
      }
    );

    const text = result?.data?.text?.trim() || "";

    console.log("✅ OCR RESULT:");
    console.log(text);

    return text;

  } catch (err) {
    console.error("❌ OCR error:", err);
    return "";
  }
}


// ================================
// 🤖 AI（整形のみ・創作禁止）
// ================================
async function generateAI(ocrText) {
  try {
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
      temperature: 0,
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
    // 📥 画像取得（buffer）
    // ================================
    const buffers = await Promise.all(
      [...imageIds, ...fileIds].map(async (id) => {
        const buffer = await downloadLineMedia(id);
        return buffer || null;
      })
    ).then((res) => res.filter(Boolean));

    console.log("📸 Buffers count:", buffers.length);

    // ================================
    // 🔍 OCR（複数画像）
    // ================================
    let ocrText = "";

    for (const buffer of buffers) {
      const result = await extractTextFromBuffer(buffer);

      if (result) {
        ocrText += (ocrText ? "\n" : "") + result;
      }
    }

    ocrText = ocrText.trim();

    // ================================
    // 📦 A/B構造（内部用）
    // ================================
    const A = {
      hasText: !!ocrText,
      text: ocrText || "文字なし",
    };

    const B = {
      description: buffers.length ? "画像あり" : "画像なし",
    };

    console.log("📦 A:", A);
    console.log("📦 B:", B);

    // ================================
    // 🤖 AI（整形）
    // ================================
    let C = { summary: "文字なし" };
    let D = { summary: B.description };

    if (A.hasText) {
      const aiSummary = await generateAI(A.text);
      C.summary = aiSummary;
    }

    console.log("🧠 C:", C);
    console.log("🧠 D:", D);

    // ================================
    // 🏷 タグ生成
    // ================================
    const tags = await buildTags({
      text: A.text,
      type: "OCR",
    });

    // ================================
    // 📝 Notion保存用
    // ================================
    const OCRprop = A.text;   // ←純OCRのみ
    const AIprop = C.summary; // ←AIは別枠

    // ================================
    // 📤 保存
    // ================================
    await saveMsgToNotion({
      title: "OCR解析",
      userText: text,
      ocrText: OCRprop,
      aiText: AIprop,

      // 🔥 Cloudinaryは“必要ならだけ”
      // （今は省略してもOK）
      files: [],

      tags,
      type: "OCR",
    });

    console.log("✅ DONE");

  } catch (e) {
    console.error("❌ OCR handler error:", e);
  }
}

module.exports = { handleOCR };
