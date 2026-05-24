// ========================================
// handlers/postHandler.js
// 2026/05/09
// 📝 投稿ハンドラー
// OCR統合版
// ========================================

// ========================================
// 🏷 utility
// ========================================
const { buildTags } =
  require("../utils/tagger");

const {
  saveMsgToNotion,
} = require("../utils/saveMsgToNotion");

const {
  uploadToCloudinary,
} = require("../utils/cloudinaryUpload");

const {
  downloadLineMedia,
} = require("../utils/downloadLineMedia");

// ========================================
// 📖 OCR
// ========================================
const smartOCR =
  require("../utils/ocr");

// ========================================
// 🤖 AI
// ========================================
const Groq =
  require("groq-sdk");

const client = new Groq({
  apiKey:
    process.env.GROQ_API_KEY,
});

// ========================================
// 🤖 AI generate
// ========================================
async function generateText(
  prompt
) {

  try {

    const res =
      await client.chat.completions.create({

        model:
          "llama-3.3-70b-versatile",

        temperature: 0.7,

        messages: [

          {
            role: "system",

            content: `
あなたはSNS投稿生成AIです。

ルール：
- OCR情報優先
- 自然な日本語
- 事実改変禁止
- 簡潔
            `.trim(),
          },

          {
            role: "user",
            content: prompt,
          },
        ],
      });

    return (
      res?.choices?.[0]
      ?.message?.content
      ?.trim()
      || "（生成失敗）"
    );

  } catch (e) {

    console.error(
      "❌ generateText error"
    );

    console.error(e);

    return "（AIエラー）";
  }
}

// ========================================
// 📝 post handler
// ========================================
async function handlePost({

  text = "",

  replyToken = "",

  imageIds = [],

}) {

  try {

    console.log("\n");
    console.log("=================================");
    console.log("📝 POST HANDLER START");
    console.log("=================================");

    const safeText =
      text?.trim() || "";

    // ========================================
    // ⚠️ input guard
    // ========================================
    if (
      !safeText
      && imageIds.length === 0
    ) {

      console.log(
        "⚠️ empty post"
      );

      return {
        ok: false,
      };
    }

    // ========================================
    // ☁️ image upload
    // ========================================
    const fileUrls =
      await Promise.all(

        imageIds.map(
          async (id) => {

            try {

              const buffer =
                await downloadLineMedia(id);

              if (!buffer) {
                return null;
              }

              return await uploadToCloudinary(

                buffer,

                `post_${Date.now()}_${id}`,

                "farm-ai"
              );

            } catch (e) {

              console.error(
                "❌ upload error"
              );

              console.error(e);

              return null;
            }
          }
        )

      ).then(
        res => res.filter(Boolean)
      );

    // ========================================
    // 📖 OCR
    // ========================================
    let ocrText = "";

    for (const imageId of imageIds) {

      try {

        const buffer =
          await downloadLineMedia(
            imageId
          );

        if (!buffer) {
          continue;
        }

        const result =
          await smartOCR(buffer);

        ocrText += (
          result?.refinedText
          || result?.rawText
          || ""
        ) + "\n";

      } catch (e) {

        console.error(
          "❌ OCR failed"
        );

        console.error(e);
      }
    }

    // ========================================
    // 🧠 combine
    // ========================================
    const combinedText = `

${safeText}

${ocrText}

    `.trim();

    // ========================================
    // 🤖 AI generate
    // ========================================
    const aiText =
      await generateText(`

以下の情報から
自然なSNS投稿を生成してください。

${combinedText}

      `);

    // ========================================
    // 🏷 tags
    // ========================================
    const tags =
      await buildTags({

        text: aiText,

        type: "投稿",
      });

    // ========================================
    // 💾 notion save
    // ========================================
    setImmediate(async () => {

      try {

        await saveMsgToNotion({

          title:
            tags?.[0]
            || "LINE投稿",

          userText:
            safeText,

          ocrText,

          aiText,

          files: fileUrls,

          tags,

          type: "投稿",
        });

        console.log(
          "✅ post saved"
        );

      } catch (e) {

        console.error(
          "❌ post save error"
        );

        console.error(e);
      }
    });

    // ========================================
    // ✅ complete
    // ========================================
    console.log("=================================");
    console.log("✅ POST HANDLER COMPLETE");
    console.log("=================================");

    return {

      ok: true,

      aiText,

      ocrText,

      tags,

      files: fileUrls,
    };

  } catch (e) {

    console.error(
      "❌ post handler error"
    );

    console.error(e);

    return {

      ok: false,

      error: e.message,
    };
  }
}

// ========================================
// 📤 export
// ========================================
module.exports = {
  handlePost,
};
