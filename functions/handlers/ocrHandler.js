// handlers/ocrHandler.js
// 2026/05/03
// 🧪 OCRフルパイプライン（単一ファイル版）
// 「とりあえず動かす」ことに全振り

const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const Groq = require("groq-sdk");

// ================================
// 🔐 環境変数
// ================================
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Notionは既存関数を使う前提（なければconsoleでOK）
let saveMsgToNotion;
try {
  saveMsgToNotion = require("../utils/saveMsgToNotion").saveMsgToNotion;
} catch (e) {
  console.log("⚠️ Notion未接続 → console出力モード");
}

// ================================
// 🤖 AIクライアント
// ================================
const client = new Groq({
  apiKey: GROQ_API_KEY,
});

// ================================
// 📩 メイン関数
// ================================
/**
 * 画像 → OCR → AI補正 → 保存
 * @param {Buffer} imageBuffer
 */
async function ocrHandler(imageBuffer) {
  try {
    console.log("🚀 OCR Handler START");

    // ============================
    // ① 画像前処理（ここ超重要）
    // ============================
    console.log("🧼 前処理中...");
    const preprocessed = await sharp(imageBuffer)
      .grayscale()         // 色を削って文字強調
      .normalize()         // コントラスト強化
      .resize({ width: 1500 }) // 解像度UP
      .sharpen()           // エッジ強化
      .toBuffer();

    // ============================
    // ② OCR（雑でもOK）
    // ============================
    console.log("🔍 OCR中...");
    const ocrResult = await Tesseract.recognize(preprocessed, "jpn", {
      logger: m => console.log("OCR:", m.status),
    });

    const rawText = ocrResult.data.text;
    console.log("📄 OCR結果（raw）:\n", rawText);

    // ============================
    // ③ AIで文章復元（ここが本体）
    // ============================
    console.log("🧠 AI補正中...");
    let fixedText = rawText;

    try {
      const prompt = `
以下はOCRで抽出された日本語テキストですが、誤認識や崩れが多く含まれています。
自然で読みやすい日本語の文章に修正してください。

条件：
- 原文の意味をできるだけ維持
- 哲学書っぽい文章ならその文体を保つ
- 推測しすぎない（不明な部分はそのままでもOK）

--- OCR結果 ---
${rawText}
----------------
`;

      const aiRes = await client.chat.completions.create({
        model: "llama-3.1-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      fixedText = aiRes.choices[0].message.content.trim();

    } catch (aiErr) {
      console.error("⚠️ AI補正失敗 → raw使用", aiErr);
    }

    console.log("📝 AI補正結果:\n", fixedText);

    // ============================
    // ④ 保存（Notion or fallback）
    // ============================
    if (saveMsgToNotion) {
      console.log("💾 Notion保存中...");
      await saveMsgToNotion({
        userText: fixedText,
        rawOCR: rawText,
        type: "ocr",
      });
    } else {
      console.log("📦 保存スキップ（Notion未設定）");
    }

    // ============================
    // 🎉 完了
    // ============================
    console.log("✅ OCR Handler DONE");

    return {
      success: true,
      rawText,
      fixedText,
    };

  } catch (err) {
    console.error("❌ OCR Handler ERROR:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ================================
// export
// ================================
module.exports = { ocrHandler };
