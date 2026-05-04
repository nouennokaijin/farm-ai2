// secretary/dispatcher.js

const { ruleEngine } = require("./ruleEngine");
const { classifyAI } = require("./classifyAI");
const { ocrTxtAI } = require("./ocrTxtAI");

const { downloadLineMedia } = require("../utils/downloadLineMedia");
const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const handleOCR = require("../handlers/ocrHandler");

async function dispatcher(event) {
  try {
    console.log("📥 受信:", event.message?.type);

    let result = await ruleEngine(event);
    console.log("🧠 ルール判定:", result);

    let userText = "";
    let ocrText = "";
    let imageUrl = "";

    if (event.message?.type === "text") {
      userText = event.message.text || "";
    }

    if (event.message?.type === "image") {
      const messageId = event.message.id;

      const buffer = await downloadLineMedia(messageId);

      const resultOCR = await handleOCR({
        imageBuffer: buffer,
        event,
      });

      ocrText = resultOCR.text || "";
    }

    if (result === "0") {
      console.log("🤖 AI判定へ");

      if (event.message.type === "text") {
        result = await classifyAI(userText);
      }

      if (event.message.type === "image") {
        result = await ocrTxtAI(ocrText);
      }
    }

    console.log("🎯 最終分類:", result);

    const typeMap = {
      post: "投稿",
      receipt: "レシート",
      schedule: "予定",
      ocr: "OCR",
      chat: "チャット",
    };

    const tags = await buildTags({
      text: userText || ocrText,
      type: typeMap[result] || "チャット",
    });

    console.log("🏷 タグ:", tags);

    await saveMsgToNotion({
      title: tags[0] || "メモ",
      userText,
      ocrText,
      tags,
      files: imageUrl ? [imageUrl] : [],
    });

    console.log("✅ 完了");

  } catch (err) {
    console.error("❌ dispatcherエラー:", err);
  }
}

module.exports = { dispatcher };
