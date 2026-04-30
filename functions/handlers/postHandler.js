// postHandler.js

const client = require("../utils/lineClient");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { downloadLineMedia } = require("../utils/lineMedia");

// ===== Firebaseアップロード =====
const { uploadToFirebase } = require("../utils/firebaseUpload");

const { generateTags } = require("../utils/tagger");
const { extractTextFromImage } = require("../utils/ocr");

// ===== 投稿処理 =====
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("handlePost:", text);

  try {
    // ===== テキスト安全化 =====
    const safeText = text && text.trim() !== "" ? text : "（テキストなし）";

    // =====================================================
    // 📦 Firebaseアップロード処理（並列）
    // =====================================================
    const uploadTasks = [];

    // ===== 画像処理 =====
    for (const id of imageIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          // ★同一時刻ズレ防止のためここで固定
          const now = Date.now();

          return await uploadToFirebase(
            buffer,
            `img_${now}_${id}.jpg`,
            "image/jpeg"
          );
        })()
      );
    }

    // ===== ファイル処理 =====
    for (const id of fileIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          const now = Date.now();

          return await uploadToFirebase(
            buffer,
            `file_${now}_${id}`,
            "application/octet-stream"
          );
        })()
      );
    }

    // ===== 並列実行 =====
    const results = await Promise.all(uploadTasks);
    const fileUrls = results.filter(Boolean);

    console.log("uploaded files:", fileUrls);

    // =====================================================
    // 🔍 OCR処理（Firebase URL前提）
    // =====================================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        // ★Firebase Storage URLだけ対象にする
        if (!url || !url.includes("storage.googleapis.com")) continue;

        const extracted = await extractTextFromImage(url);

        if (extracted && extracted.trim()) {
          ocrText += "\n[OCR]\n" + extracted;
        }

      } catch (err) {
        // OCR失敗しても全体は止めない
        console.error("OCR error:", err);
      }
    }

    // ===== 最終テキスト統合 =====
    const finalText = safeText + (ocrText ? "\n\n" + ocrText : "");

    console.log("finalText:", finalText);

    // ===== タグ生成 =====
    const tags = await generateTags(finalText);

    // =====================================================
    // 📱 LINE返信（即時レスポンス）
    // =====================================================
/* 
   if (replyToken) {
      try {
        await client.replyMessage({
          replyToken,
          messages: [
            {
              type: "text",
              text: "保存＋解析したよ🧠",
            },
          ],
        });
      } catch (err) {
        console.error("LINE reply error:", err);
      }
    }
*/
    // =====================================================
    // 🧾 Notion保存（非同期）
    // =====================================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "LINE投稿",
          content: finalText,
          tags,
          files: fileUrls,
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
