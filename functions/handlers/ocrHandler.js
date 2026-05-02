// handlers/ocrHandler.js
// 2026/5/2
// Okiura Kazuo


const { buildTags } = require("../utils/tagger");

const tags = await buildTags({
  text: cleanedText,
  type: "OCR"
});

const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

// ================================
// Cloudinary（画像保存）
// ================================
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");

// ================================
// LINE画像取得
// ================================
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// OCR（画像 → テキスト）
// ================================
const { extractTextFromImage } = require("../utils/ocr");

// ================================
// ★ AIクライアント（Groq）
// ================================
const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🧠 AI関数（内蔵）
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
// 🧹 OCRテキスト整形
// ================================
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ================================
// 📖 OCR処理ハンドラ
// ================================
async function handleOCR({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("📖 handleOCR start");

  try {
    // =====================================================
    // ☁️ 画像アップロード
    // =====================================================
    const uploadTasks = [];

    for (const id of [...imageIds, ...fileIds]) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToCloudinary(
            buffer,
            `ocr_${Date.now()}_${id}`,
            "book-ocr"
          );
        })()
      );
    }

    const fileUrls = (await Promise.all(uploadTasks)).filter(Boolean);

    if (fileUrls.length === 0) {
      console.log("⚠️ 画像なし → OCRスキップ");
      return;
    }

    // =====================================================
    // 🔍 OCR
    // =====================================================
    let rawOcrText = "";

    for (const url of fileUrls) {
      try {
        const extracted = await extractTextFromImage(url);
        if (extracted) rawOcrText += extracted + "\n";
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    const cleanedText = cleanText(rawOcrText);

    if (!cleanedText) {
      console.log("⚠️ OCR結果が空");
    }

    console.log("📝 OCR TEXT:", cleanedText.slice(0, 200));

    // =====================================================
    // 🧠 AI要約＋感想
    // =====================================================
    const aiResult = await generateText(`
あなたは哲学書をわかりやすく解説する専門家です。

以下の文章を読んで、要約と感想を出力してください。

# 出力形式（JSON）
{
  "summary": "",
  "impression": ""
}

# ルール
・summaryは100〜150文字
・impressionは100文字前後
・やさしい言葉で

# 入力
${cleanedText || "（テキストなし）"}
`);

    console.log("🤖 AI RESULT:", aiResult);

    // =====================================================
    // 🧩 JSONパース
    // =====================================================
    let summary = "";
    let impression = "";

    try {
      // JSON部分だけ抽出（安全対策）
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiResult);

      summary = parsed.summary || "";
      impression = parsed.impression || "";

    } catch (e) {
      console.error("JSON parse error:", e);

      summary = aiResult;
      impression = "";
    }

    // =====================================================
    // 💾 Notion保存
    // =====================================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "OCR読書ログ",
        userText: text,
        aiText: `${summary}\n\n${impression}`,
        ocrText: cleanedText,
        files: fileUrls,
        tags: ["OCR", "読書"],
        type: "book"
      });
    });

  } catch (err) {
    console.error("🔥 handleOCR error:", err);
  }
}

module.exports = { handleOCR };
