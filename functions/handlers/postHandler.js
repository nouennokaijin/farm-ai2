// postHandler.js

const client = require("../utils/lineClient");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

const { downloadLineMedia } = require("../utils/lineMedia");
const { uploadToDrive } = require("../utils/drive");
const { generateTags } = require("../utils/tagger");
const { extractTextFromImage } = require("../utils/ocr"); // ★OCR追加

// ===== 投稿処理 =====
async function handlePost({ text = "", replyToken, imageIds = [], fileIds = [] }) {
  console.log("handlePost:", text);

  try {
    // ===== テキスト保険 =====
    const safeText = text && text.trim() !== "" ? text : "（テキストなし）";

    // ===== Driveアップ（並列）=====
    const uploadTasks = [];

    // 画像
    for (const id of imageIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToDrive(
            buffer,
            `img_${Date.now()}_${id}.jpg`,
            "image/jpeg"
          );
        })()
      );
    }

    // ファイル
    for (const id of fileIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToDrive(
            buffer,
            `file_${Date.now()}_${id}`,
            "application/octet-stream"
          );
        })()
      );
    }

    // 並列実行
    const results = await Promise.all(uploadTasks);

    // null除去
    const fileUrls = results.filter(Boolean);
    console.log("uploaded files:", fileUrls);

    // ===== OCR（画像のみ対象）=====
    let ocrText = "";

    for (const url of fileUrls) {
      // 軽い判定（Drive URL + 拡張子）
      if (url.includes("id=")) {
        try {
          const extracted = await extractTextFromImage(url);

          if (extracted && extracted.trim()) {
            ocrText += "\n[OCR]\n" + extracted;
          }
        } catch (err) {
          console.error("OCR error:", err);
        }
      }
    }

    // ===== テキスト統合 =====
    const finalText = safeText + (ocrText ? "\n\n" + ocrText : "");

    console.log("finalText:", finalText);

    // ===== タグ生成（OCR後にやるのが重要）=====
    const tags = await generateTags(finalText);
    console.log("tags:", tags);

    // ===== LINE返信 =====
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

    // ===== Notion保存（非同期）=====
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "LINE投稿",
          content: finalText, // ★OCR込み
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
