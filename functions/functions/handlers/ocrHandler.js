// ========================================
// handlers/ocrHandler.js
// 2026/05/09
// 🤖📖 OCR + AI ハイブリッドハンドラー
// Okiura Kazuo
//
// 🎯 役割
// ・OCR実行
// ・AI OCR補正
// ・AI insight生成
// ・タグ生成
// ・Notion保存
//
// ✅ 改良版
// ・ocrPlsAI対応
// ・崩れOCRをAI補正
// ・OCRログ強化
// ・空OCR対策
// ・Notion保存一本化
//
// ========================================

// ========================================
// 🏷 utility
// ========================================
const {
  buildTags,
} = require("../utils/tagger");

const {
  saveMsgToNotion,
} = require("../utils/saveMsgToNotion");

// ========================================
// 🤖📖 OCR + AI engine
// ========================================
const {
  ocrPlsAI,
} = require("../utils/ocrPlsAI");

// ========================================
// 🤖 AI
// ========================================
const Groq =
  require("groq-sdk");

const client =
  new Groq({

    apiKey:
      process.env.GROQ_API_KEY,

  });

// ========================================
// 🤖 AI insight generate
// OCR結果を整理
// ========================================
async function generateInsight(
  text
) {

  try {

    // 空文字防止
    if (!text) {
      return "";
    }

    console.log(
      "🤖 generateInsight start"
    );

    // ========================================
    // AI要約
    // ========================================
    const res =
      await client.chat.completions.create({

        model:
          "llama-3.3-70b-versatile",

        temperature: 0.3,

        messages: [

          {
            role: "system",

            content: `
OCR内容を整理してください。

ルール：
- 推測禁止
- 事実のみ
- 簡潔
- 箇条書きOK
            `.trim(),
          },

          {
            role: "user",

            content:
              text,
          },
        ],
      });

    // ========================================
    // insight抽出
    // ========================================
    const insight =

      res?.choices?.[0]
        ?.message?.content
        ?.trim()

      || "";

    console.log(
      "✅ insight generated"
    );

    return insight;

  } catch (e) {

    console.error(
      "❌ generateInsight error"
    );

    console.error(e);

    return "";
  }
}

// ========================================
// 📖 OCR main handler
// ========================================
async function handleOCR({

  text = "",

  imageBuffer = null,

  imageUrl = "",

  event = null,

}) {

  try {

    console.log("\n");

    console.log(
      "================================="
    );

    console.log(
      "🤖📖 OCR HANDLER START"
    );

    console.log(
      "================================="
    );

    // ========================================
    // 🔍 OCR engine check
    // ========================================
    console.log(
      "🧪 ocrPlsAI type:",
      typeof ocrPlsAI
    );

    // OCR engine異常チェック
    if (
      typeof ocrPlsAI
      !== "function"
    ) {

      console.error(
        "❌ ocrPlsAI is not function"
      );

      return {

        ok: false,

        reason:
          "ocr_engine_invalid",
      };
    }

    // ========================================
    // ⚠️ input guard
    // ========================================
    if (
      !imageBuffer
      && !text
    ) {

      console.log(
        "⚠️ no OCR input"
      );

      return {

        ok: false,

        reason:
          "no_input",
      };
    }

    // ========================================
    // 🤖📖 OCR + AI execute
    // ========================================
    let rawOCR = "";

    let repairedText = "";

    if (imageBuffer) {

      try {

        console.log(
          "🤖📖 ocrPlsAI start"
        );

        // ========================================
        // OCR + AI実行
        // ========================================
        const result =
          await ocrPlsAI({

            imageBuffer,

            fallbackText:
              text,

          });

        console.log(
          "📖 ocrPlsAI raw result:"
        );

        console.log(
          JSON.stringify(
            result,
            null,
            2
          )
        );

        // ========================================
        // 結果抽出
        // ========================================
        rawOCR =
          result?.rawOCR
          || "";

        repairedText =
          result?.repairedText
          || "";

        console.log(
          "📝 repaired preview:"
        );

        console.log(
          repairedText.slice(
            0,
            300
          )
        );

        console.log(
          "✅ OCR + AI success"
        );

      } catch (ocrErr) {

        console.error(
          "❌ OCR + AI error"
        );

        console.error(
          ocrErr
        );
      }
    }

    // ========================================
    // 🧹 normalize
    // ========================================
    repairedText =

      (
        repairedText
        || rawOCR
        || text
        || ""
      )
      .trim();

    // 改行整理
    repairedText =

      repairedText.replace(
        /\n{3,}/g,
        "\n\n"
      );

    // ========================================
    // ⚠️ empty OCR
    // ========================================
    if (!repairedText) {

      console.log(
        "⚠️ OCR empty"
      );

      return {

        ok: false,

        reason:
          "empty_result",
      };
    }

    console.log(
      "📝 repaired length:",
      repairedText.length
    );

    // ========================================
    // 🤖 AI insight
    // ========================================
    const insight =
      await generateInsight(
        repairedText
      );

    // ========================================
    // 🏷 tag generate
    // ========================================
    const tags =
      await buildTags({

        text:
          repairedText,

        type:
          "OCR",
      });

    console.log(
      "🏷 OCR tags:"
    );

    console.log(tags);

    // ========================================
    // 💾 save notion async
    // OCR handlerのみ保存責任を持つ
    // ========================================
    setImmediate(async () => {

      try {

        console.log(
          "💾 OCR notion save start"
        );

        await saveMsgToNotion({

          title:
            tags?.[0]
            || "OCRログ",

          userText:
            text,

          // AI補正版を保存
          ocrText:
            repairedText,

          // 生OCRも保存
          rawOCR,

          aiInsight:
            insight,

          tags,

          files:
            imageUrl
              ? [imageUrl]
              : [],

          type:
            "OCR",
        });

        console.log(
          "✅ OCR notion saved"
        );

      } catch (saveErr) {

        console.error(
          "❌ OCR notion save error"
        );

        console.error(
          saveErr
        );
      }
    });

    // ========================================
    // ✅ complete
    // ========================================
    console.log(
      "================================="
    );

    console.log(
      "✅ OCR HANDLER COMPLETE"
    );

    console.log(
      "================================="
    );

    return {

      ok: true,

      text:
        repairedText,

      rawOCR,

      insight,

      tags,
    };

  } catch (e) {

    console.error(
      "❌ OCR handler error"
    );

    console.error(e);

    return {

      ok: false,

      error:
        e.message,
    };
  }
}

// ========================================
// 📤 export
// ========================================
module.exports = {
  handleOCR,
};
