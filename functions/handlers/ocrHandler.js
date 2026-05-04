// handlers/ocrHandler.js

const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const smartOCR = require("../utils/ocr");

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateInsight(text) {
  try {
    if (!text) return "";

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "OCR内容の要約・構造化（推測禁止・事実のみ）",
        },
        { role: "user", content: text },
      ],
    });

    return res?.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("AI error:", e);
    return "";
  }
}

async function handleOCR({ text = "", imageBuffer, event }) {
  try {
    if (!imageBuffer && !text) {
      return { ok: false, reason: "no_input" };
    }

    let ocrText = "";

    if (imageBuffer) {
      try {
        const result = await smartOCR(imageBuffer);
        ocrText = result?.rawText || "";
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    ocrText = (ocrText || text).trim();

    if (!ocrText) {
      return { ok: false, reason: "empty_result" };
    }

    const insight = await generateInsight(ocrText);

    const tags = await buildTags({
      text: ocrText,
      type: "OCR",
    });

    setImmediate(() => {
      saveMsgToNotion({
        title: "OCRログ",
        userText: text,
        ocrText: ocrText,
        aiInsight: insight,
        tags: tags,
        type: "OCR",
      }).catch(console.error);
    });

    return {
      ok: true,
      text: ocrText,
      insight,
      tags,
    };

  } catch (e) {
    console.error("OCR handler error:", e);
    return { ok: false, error: e.message };
  }
}

module.exports = handleOCR;
