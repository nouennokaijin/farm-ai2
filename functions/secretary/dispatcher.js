// secretary/dispatcher.js
// 2026/05/04
// 📡 LINEイベントの司令塔（完成版）
// ・LINEメッセージ受信
// ・ルール判定 → AIフォールバック
// ・画像はダウンロード → Cloudinary → OCR
// ・タグ生成
// ・Notion保存

// ================================
// 🧠 依存モジュール（secretary）
// ================================
const { ruleEngine } = require("./ruleEngine");
const { classifyAI } = require("./classifyAI");
const { ocrTxtAI } = require("./ocrTxtAI");

// ================================
// 🧠 外部ユーティリティ
// ================================
const { downloadLineMedia } = require("../utils/downloadLineMedia");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { buildTags } = require("../utils/tagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");
const { runOCR } = require("../utils/ocr");

// ================================
// 🚀 メイン処理
// ================================
async function dispatcher(event) {
  try {
    console.log("📥 受信:", event.message?.type);

    let result = await ruleEngine(event);
    console.log("🧠 ルール判定:", result);

    let userText = "";
    let ocrText = "";
    let imageUrl = "";

    // ================================
    // 📝 テキスト
    // ================================
    if (event.message?.type === "text") {
      userText = event.message.text || "";
    }

    // ================================
    // 🖼 画像
    // ================================
    if (event.message?.type === "image") {
      const messageId = event.message.id;

      // ① LINEから取得
      const buffer = await downloadLineMedia(messageId);

      // ② Cloudinaryアップロード
      imageUrl = await uploadToCloudinary(buffer, "line_image");

      // ③ OCR（テキスト保存用）
      ocrText = await runOCR(imageUrl);
    }

    // ================================
    // 🤖 AIフォールバック
    // ================================
    if (result === "0") {
      console.log("🤖 AI判定へ");

      if (event.message.type === "text") {
        result = await classifyAI(userText);
      }

      if (event.message.type === "image") {
        result = await ocrTxtAI(imageUrl);
      }
    }

    console.log("🎯 最終分類:", result);

    // ================================
    // 🏷 タグ生成（日本語）
    // ================================
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

    // ================================
    // 💾 Notion保存
    // ================================
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

// ================================
// 📤 エクスポート
// ================================
module.exports = { dispatcher };
