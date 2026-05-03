// handlers/ocrHandler.js
// 2026/5/3 ハイブリッドOCR完成版
// Tesseract（第一）→ AI OCR（フォールバック）→ AI整形（最終）
// 「純OCR」「混入禁止」「安定性重視」

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const { downloadLineMedia } = require("../utils/downloadLineMedia");

const Tesseract = require("tesseract.js");
const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


// ================================
// 🧠 ① Tesseract OCR（第一段階）
// ================================
async function tesseractOCR(buffer) {
  try {
    console.log("🔍 Tesseract OCR start");

    const { data } = await Tesseract.recognize(buffer, "jpn", {
      logger: (m) => console.log("Tesseract:", m.status),
    });

    const text = (data?.text || "").trim();

    console.log("✅ Tesseract RESULT:");
    console.log(text);

    return text;

  } catch (err) {
    console.error("❌ Tesseract error:", err);
    return "";
  }
}


// ================================
// 🤖 ② AI OCR（フォールバック）
// ================================
async function aiOCR(buffer) {
  try {
    console.log("🧠 AI OCR fallback start");

    // ⚠️ bufferをbase64に変換（Vision用）
    const base64 = buffer.toString("base64");

    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはOCRエンジンです。
画像内の文字をそのまま出力してください。

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
              type: "image_base64",
              image_base64: base64,
            },
          ],
        },
      ],
    });

    const text = res?.choices?.[0]?.message?.content?.trim() || "";

    console.log("✅ AI OCR RESULT:");
    console.log(text);

    return text;

  } catch (err) {
    console.error("❌ AI OCR error:", err);
    return "";
  }
}


// ================================
// 🧹 ③ テキスト整形（AI）
// ================================
async function refineText(rawText) {
  try {
    if (!rawText) return "";

    console.log("🧹 refine start");

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,

      messages: [
        {
          role: "system",
          content: `
あなたはテキスト整形ツールです。

ルール：
- 内容を変更しない
- 新しい文章を作らない
- 要約しない
- 改行だけ整理する
          `.trim(),
        },
        {
          role: "user",
          content: rawText,
        },
      ],
    });

    const text = res?.choices?.[0]?.message?.content?.trim() || rawText;

    console.log("✅ refine done");

    return text;

  } catch (e) {
    console.error("❌ refine error:", e);
    return rawText; // 失敗しても元を返す
  }
}


// ================================
// 📖 メインOCR処理
// ================================
async function handleOCR({
  text = "",
  imageIds = [],
}) {
  try {
    console.log("🚀 OCR HANDLER START");

    // ================================
    // 📥 画像取得（ここでbuffer取得）
    // ================================
    const buffers = await Promise.all(
      imageIds.map(async (id) => {
        const buffer = await downloadLineMedia(id);
        return buffer || null;
      })
    );

    const validBuffers = buffers.filter(Boolean);

    console.log("📸 buffers:", validBuffers.length);

    // ================================
    // 🔍 OCR実行（ハイブリッド）
    // ================================
    let ocrText = "";

    for (const buffer of validBuffers) {

      // ① Tesseract
      let result = await tesseractOCR(buffer);

      // ② ダメならAI OCR
      if (!result || result.length < 5) {
        console.log("⚠️ fallback to AI OCR");
        result = await aiOCR(buffer);
      }

      if (result) {
        ocrText += (ocrText ? "\n" : "") + result;
      }
    }

    ocrText = ocrText.trim();

    // ================================
    // 📦 A（純OCR）
    // ================================
    const A = {
      hasText: !!ocrText,
      text: ocrText || "文字なし",
    };

    console.log("📦 OCR TEXT:");
    console.log(A.text);

    // ================================
    // 🧹 整形（必要な場合のみ）
    // ================================
    let finalText = A.text;

    if (A.hasText) {
      finalText = await refineText(A.text);
    }

    // ================================
    // 🏷 タグ
    // ================================
    const tags = await buildTags({
      text: finalText,
      type: "OCR",
    });

    // ================================
    // 📝 Notion保存
    // ================================
    await saveMsgToNotion({
      title: "OCR解析",
      userText: text,

      // ✅ 完全に分離
      ocrText: A.text,     // 生OCR
      aiText: finalText,   // 整形後

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
