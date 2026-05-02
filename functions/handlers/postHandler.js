// handlers/postHandler.js
// 2026/5/2
// Okiura Kazuo

const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

// ================================
// Cloudinary
// ================================
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");

// ================================
// LINE画像取得
// ================================
const { downloadLineMedia } = require("../utils/downloadLineMedia");

// ================================
// 各種ユーティリティ
// ================================
const { generateTags } = require("../utils/tagger");
const { extractTextFromImage } = require("../utils/ocr");

// ★ AI（テキスト & 画像対応）
const { generateText, generateVisionText } = require("../utils/ai");

// ================================
// 🧭 基本理念（投稿の軸）
// ================================
const baseConcept = `
便利すぎる世界で、
人は少しだけ弱くなった気がする。
ボタンひとつで何でもできるけど、
手で触れることを大切にしたい。
ゆっくりでいい。
完璧じゃなくていい。
少しくらい間違ってもいい。
きっと大地は、そんなこと気にしない。
`;

// ================================
// 🎯 AIの人格定義（ブレ防止）
// ================================
const corePrompt = `
あなたは、自然や手仕事の価値を大切にする書き手です。

【価値観】
・便利さに流されすぎない
・手で触れることを大切にする
・不完全さを肯定する
・自然の視点を持つ
・静かで余韻のある表現

【文章ルール】
・X投稿用（140〜150文字）
・自然な日本語
・言い切りすぎない
・ポエム寄りだが伝わる文章
`;

// ================================
// 投稿処理
// ================================
async function handlePost({
  text = "",
  replyToken,
  imageIds = [],
  fileIds = [],
}) {
  console.log("📝 handlePost:", text);
  console.log("🖼 imageIds:", imageIds);
  console.log("📎 fileIds:", fileIds);

  try {
    const safeText = text && text.trim() !== "" ? text : "";

    // =====================================================
    // ☁️ Cloudinaryアップロード（並列）
    // =====================================================
    const uploadTasks = [];

    // 🖼️ 画像
    for (const id of imageIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToCloudinary(
            buffer,
            `img_${Date.now()}_${id}`,
            "farm-ai"
          );
        })()
      );
    }

    // 📎 ファイル
    for (const id of fileIds) {
      uploadTasks.push(
        (async () => {
          const buffer = await downloadLineMedia(id);
          if (!buffer) return null;

          return await uploadToCloudinary(
            buffer,
            `file_${Date.now()}_${id}`,
            "farm-ai"
          );
        })()
      );
    }

    const results = await Promise.all(uploadTasks);
    const fileUrls = results.filter(Boolean);

    console.log("☁️ uploaded files:", fileUrls);

    // =====================================================
    // 🔍 OCR処理
    // =====================================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        if (!url.includes("res.cloudinary.com")) continue;

        const extracted = await extractTextFromImage(url);

        if (extracted && extracted.trim()) {
          ocrText += extracted + "\n";
        }

      } catch (err) {
        console.error("OCR error:", err);
      }
    }

    // =====================================================
    // 🧠 AI投稿生成（ここが今回のコア）
    // =====================================================
    let draft = "";

    if (fileUrls.length > 0) {
      // ================================
      // 🖼️ 画像あり（Vision）
      // ================================
      draft = await generateVisionText({
        prompt: `
${corePrompt}

以下の理念と、画像・テキストをもとに投稿文を作成してください。

【理念】
${baseConcept}

【テキスト】
${safeText || "（テキストなし）"}
        `,
        images: fileUrls
      });

    } else {
      // ================================
      // 📝 テキストのみ
      // ================================
      draft = await generateText(`
${corePrompt}

以下の理念と内容をもとに投稿文を作成してください。

【理念】
${baseConcept}

【内容】
${safeText}
`);
    }

    // ================================
    // ✨ 2段階目（仕上げ）
    // ================================
    const finalPost = await generateText(`
以下の文章をX投稿用として最適化してください。

【ルール】
・150文字以内
・読みやすく整える
・冗長削除
・自然な余韻を残す

文章：
${draft}
`);

    console.log("🧾 finalPost:", finalPost);

    // =====================================================
    // 🏷 タグ生成（AI投稿ベース）
    // =====================================================
    const tags = await generateTags(finalPost);

    // =====================================================
    // 💾 Notion保存（非同期）
    // =====================================================
    setImmediate(async () => {
      try {
        await saveMsgToNotion({
          title: "LINE投稿",

          // 本文（ユーザー入力）
          userText: safeText,

          // AI生成文
          aiText: finalPost,

          // OCR
          ocrText: ocrText,

          // ファイル
          files: fileUrls,

          tags,
        });

        console.log("✅ Notion saved");

      } catch (err) {
        console.error("🔥 Notion save error:", err);
      }
    });

  } catch (err) {
    console.error("🔥 handlePost error:", err);
  }
}

module.exports = { handlePost };
