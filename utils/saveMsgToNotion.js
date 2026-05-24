// utils/saveMsgToNotion.js
// 2026/5/2
// Notion保存ユーティリティ

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ================================
// 🧾 Notion保存
// ================================
async function saveMsgToNotion(data) {
  const {
    title,
    content,
    userText,
    aiText,
    ocrText,
    receiptText,
    tags = [],
    files = [],
  } = data;

  const now = new Date();

  // 🇯🇵 JST
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  const mainText = userText || content || "";
  const bodyText = `【${displayTime}】\n${mainText}`;

  try {

    // ================================
    // 📎 ファイル整形（安全化）
    // ================================
    const fileProperty = (files || [])
      .filter(Boolean)
      .map((url, i) => ({
        name: `file_${i + 1}_${Date.now()}`, // ← 衝突防止
        external: { url },
      }));

    // ================================
    // 🧠 properties構築
    // ================================
    const properties = {
      名前: {
        title: [{ text: { content: title || "無題" } }],
      },

      日付: {
        date: { start: nowISO },
      },

      マルチセレクト: {
        multi_select: (tags.length ? tags : ["その他"]).map((t) => ({
          name: t,
        })),
      },
    };

    if (aiText) {
      properties["AI"] = {
        rich_text: [{ text: { content: aiText } }],
      };
    }

    if (ocrText) {
      properties["OCR"] = {
        rich_text: [{ text: { content: ocrText } }],
      };
    }

    if (receiptText) {
      properties["レシート"] = {
        rich_text: [{ text: { content: receiptText } }],
      };
    }

    if (fileProperty.length > 0) {
      properties["ファイル&メディア"] = {
        files: fileProperty,
      };
    }

    // ================================
    // 🚀 Notion送信
    // ================================
    const res = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: { database_id: DATABASE_ID },
        properties,

        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: bodyText },
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
