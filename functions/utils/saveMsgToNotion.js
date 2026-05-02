// utils/saveMsgToNotion.js

const axios = require("axios");

// ================================
// Notion認証情報
// ================================
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ================================
// Notion保存関数
// ================================
// 受け取るデータを拡張
// - userText: ユーザー入力
// - aiText: AI生成文
// - ocrText: OCR生データ
// - receiptText: 整形済みレシート
// - その他は既存互換
// ================================
async function saveMsgToNotion(data) {
  const {
    title,
    content,       // 既存（互換用）
    userText,      // 追加
    aiText,        // 追加
    ocrText,       // 追加
    receiptText,   // 追加
    tags = [],
    files = [],
  } = data;

  console.log("DATABASE_ID:", DATABASE_ID);

  const now = new Date();

  // ================================
  // 日本時間生成
  // ================================
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  // ================================
  // メイン本文（従来互換）
  // userText優先、なければcontent
  // ================================
  const mainText = userText || content || "";
  const bodyText = `【${displayTime}】\n${mainText}`;

  try {
    // ================================
    // Cloudinary URLそのまま使用
    // ================================
    const fileProperty = (files || [])
      .filter((url) => typeof url === "string" && url.startsWith("http"))
      .map((url, i) => ({
        name: `file_${i + 1}`,
        external: { url },
      }));

    // ================================
    // 🧠 ここが今回のコア（プロパティ拡張）
    // ================================
    const properties = {
      // タイトル
      名前: {
        title: [
          {
            text: {
              content: title || "無題",
            },
          },
        ],
      },

      // 日付
      日付: {
        date: {
          start: nowISO,
        },
      },

      // タグ
      マルチセレクト: {
        multi_select: (tags.length > 0 ? tags : ["その他"]).map((tag) => ({
          name: tag,
        })),
      },
    };

    // ================================
    // 条件付きで各プロパティ追加
    // 空は送らない（Notionエラー防止）
    // ================================

    if (aiText) {
      properties["AI"] = {
        rich_text: [
          {
            text: { content: aiText },
          },
        ],
      };
    }

    if (ocrText) {
      properties["OCR"] = {
        rich_text: [
          {
            text: { content: ocrText },
          },
        ],
      };
    }

    if (receiptText) {
      properties["レシート"] = {
        rich_text: [
          {
            text: { content: receiptText },
          },
        ],
      };
    }

    // ファイル（あれば）
    if (fileProperty.length > 0) {
      properties["ファイル&メディア"] = {
        files: fileProperty,
      };
    }

    // ================================
    // Notion API送信
    // ================================
    const res = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          database_id: DATABASE_ID,
        },

        properties,

        // 本文（メインテキスト）
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: bodyText,
                  },
                },
              ],
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("NOTION URL:", res.data.url);

  } catch (err) {
    console.error("Notion error:", err.response?.data || err);
  }
}

module.exports = { saveMsgToNotion };
