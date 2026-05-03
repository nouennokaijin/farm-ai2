// handlers/ocrHandler.js

const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const Groq = require("groq-sdk");

// Notion（なくても動くようにする）
let saveMsgToNotion;
try {
  saveMsgToNotion = require("../utils/saveMsgToNotion").saveMsgToNotion;
} catch (e) {
  console.log("⚠️ Notion未接続");
}

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 👇 これがないと動かない
async function ocrHandler(imageBuffer) {
  try {
    console.log("🧼 preprocess...");
    const img = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .resize({ width: 1500 })
      .sharpen()
      .toBuffer();

    console.log("🔍 OCR...");
    const result = await Tesseract.recognize(img, "jpn");
    const rawText = result.data.text;

    console.log("🧠 AI補正...");
    let fixedText = rawText;

    try {
      const res = await client.chat.completions.create({
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "user",
            content: `OCRの崩れた日本語を自然な文章に直して\n\n${rawText}`,
          },
        ],
        temperature: 0.2,
      });

      fixedText = res.choices[0].message.content.trim();
    } catch (e) {
      console.log("⚠️ AI失敗 → raw使用");
    }

    if (saveMsgToNotion) {
      await saveMsgToNotion({
        userText: fixedText,
        rawOCR: rawText,
        type: "ocr",
      });
    }

    return { success: true, rawText, fixedText };

  } catch (err) {
    console.error("❌ OCR error:", err);
    return { success: false };
  }
}

// 👇 dispatcherに合わせる
module.exports = { handleOCR: ocrHandler };
