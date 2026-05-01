// handlers/postHandler.js
// 2026/5/2
// Okiura Kazuo

const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { downloadLineMedia } = require("../utils/lineMedia");

// ================================
// 🔥 Firebase → Cloudinaryへ変更
// ================================
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");

const { generateTags } = require("../utils/tagger");
const { extractTextFromImage } = require("../utils/ocr");

// ================================
// 投稿処理
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("handlePost:", text);

  try {
    const safeText = text && text.trim() !== "" ? text : "（テキストなし）";

    // =====================================================
    // ☁️ Cloudinaryアップロード処理（並列）
    // =====================================================
    const uploadTasks = [];

    // ================================
    // 画像処理
    // ================================
    for (const id of imageIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          const now = Date.now();

          return await uploadToCloudinary(
            buffer,
            `img_${now}_${id}.jpg`,
            "farm-ai"
          );
        })()
      );
    }

    // ================================
    // ファイル処理
    // ================================
    for (const id of fileIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          const now = Date.now();

          return await uploadToCloudinary(
            buffer,
            `file_${now}_${id}`,
            "farm-ai"
          );
        })()
      );
    }

    // ================================
    // 並列実行
    // ================================
    const results = await Promise.all(uploadTasks);
    const fileUrls = results.filter(Boolean);

    console.log("uploaded files (Cloudinary):", fileUrls);

    // =====================================================
    // 🔍 OCR処理（Cloudinary URL対応）
    // =====================================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        if (!url || !url.includes("res.cloudinary.com")) continue;

        const extracted = await extractTextFromImage(url);

        if (extracted && extracted.trim()) {
          ocrText += "\n[OCR]\n" + extracted;
        }

      } catch (err) {
        console.error("OCR error:", err);
      }
    }

    // ================================
    // テキスト統合
    // ================================
    const finalText = safeText + (ocrText ? "\n\n" + ocrText : "");

    console.log("finalText:", finalText);

    // ================================
    // タグ生成
    // ================================
    const tags = await generateTags(finalText);

    // ================================
    // LINE返信（必要なら）
    // ================================
    /*
    if (replyToken) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: "text",
            text: "保存＋解析したよ🧠",
          },
        ],
      });
    }
    */

    // ================================
    // Notion保存（非同期）
    // ================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "LINE投稿",
          content: finalText,
          tags,
          files: fileUrls, // Cloudinary URL
        });

        console.log("Notion saved");

      } catch (err) {
        console.error("Notion save error:", err);
      }
    });

  } catch (err) {
    console.error("handlePost error:", err);
  }
}

module.exports = { handlePost };
