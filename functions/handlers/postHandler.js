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

// ※疑似Vision（URLをヒントにする）
async function generateVisionText({ prompt, images = [] }) {
  try {
    const imageInfo = images.length
      ? `\n参考画像URL:\n${images.join("\n")}`
      : "";

    return await generateText(prompt + imageInfo);

  } catch (err) {
    console.error("generateVisionText error:", err);
    return "（画像AI生成エラー）";
  }
}

// ================================
// 🧭 基本理念
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
// 🎯 AI人格
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
・X投稿用（128〜138文字）
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

  try {
    const safeText = text && text.trim() !== "" ? text : "";

    // =====================================================
    // ☁️ アップロード
    // =====================================================
    const uploadTasks = [];

    for (const id of [...imageIds, ...fileIds]) {
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

    const fileUrls = (await Promise.all(uploadTasks)).filter(Boolean);

    // =====================================================
    // 🔍 OCR
    // =====================================================
    let ocrText = "";

    for (const url of fileUrls) {
      try {
        const extracted = await extractTextFromImage(url);
        if (extracted) ocrText += extracted + "\n";
      } catch (e) {
        console.error("OCR error:", e);
      }
    }

    // =====================================================
    // 🧠 AI生成（1段目）
    // =====================================================
    let draft;

    if (fileUrls.length > 0) {
      draft = await generateVisionText({
        prompt: `
${corePrompt}

【理念】
${baseConcept}

【入力】
${safeText || "（テキストなし）"}
        `,
        images: fileUrls
      });
    } else {
      draft = await generateText(`
${corePrompt}

【理念】
${baseConcept}

【入力】
${safeText}
`);
    }

    // =====================================================
    // ✨ AI生成（2段目）
    // =====================================================
    const finalPost = await generateText(`
以下をX投稿として仕上げてください。

・138文字以内
・自然な流れ
・冗長削除
・余韻を残す

文章：
${draft}
`);

    console.log("🧾 finalPost:", finalPost);

    // =====================================================
    // 🏷 タグ
    // =====================================================
    const tags = await generateTags(finalPost);

    // =====================================================
    // 💾 Notion保存
    // =====================================================
    setImmediate(async () => {
      await saveMsgToNotion({
        title: "LINE投稿",
        userText: safeText,
        aiText: finalPost,
        ocrText,
        files: fileUrls,
        tags,
      });
    });

  } catch (err) {
    console.error("🔥 handlePost error:", err);
  }
}

module.exports = { handlePost };
