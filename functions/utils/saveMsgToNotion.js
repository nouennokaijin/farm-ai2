// utils/saveMsgToNotion.js

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ===== Notion保存関数 =====
async function saveMsgToNotion(data) {
  const {
    title,
    content,
    tags = [],   // ★配列で受け取る（重要）
    files = [],
  } = data;

  const now = new Date();

  // 日本時間に変換（Notion用）
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  // 本文整形
  const bodyText = `【${displayTime}】\n${content || ""}`;

  try {
    // ===== ファイルプロパティ生成 =====
    const fileProperty = (files || [])
      .filter((url) => typeof url === "string" && url.startsWith("http"))
      .map((url, i) => ({
        name: `file_${i + 1}`,
        external: { url },
      }));

    // ===== Notionへ送信 =====
    const res = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: { database_id: DATABASE_ID },

        properties: {
          // ===== タイトル =====
          名前: {
            title: [
              {
                text: {
                  content: title || "無題",
                },
              },
            ],
          },

          // ===== 日付 =====
          日付: {
            date: {
              start: nowISO,
            },
          },

          // ===== タグ（Multi-select対応）=====
          // Notion側プロパティは「multi_select」にすること
          タグ: {
            multi_select: (tags.length > 0 ? tags : ["その他"]).map((tag) => ({
              name: tag,
            })),
          },

          // ===== ファイル & メディア =====
          ...(fileProperty.length > 0 && {
            "ファイル & メディア": {
              files: fileProperty,
            },
          }),
        },

        // ===== 本文 =====
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
