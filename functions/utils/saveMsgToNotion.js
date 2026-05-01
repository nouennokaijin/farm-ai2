// utils/saveMsgToNotion.js

const axios = require("axios");

// ★ 環境変数チェック（これ超重要）
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ===== Notion保存関数 =====
async function saveMsgToNotion(data) {
  const {
    title,
    content,
    tags = [],
    files = [],
  } = data;

  // ===== ★ここでID確認ログ出す（超重要）=====
  console.log("DATABASE_ID:", DATABASE_ID);

  const now = new Date();

  // 日本時間
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  const bodyText = `【${displayTime}】\n${content || ""}`;

  try {
    // ===== ファイル整形 =====
    const fileProperty = (files || [])
      .filter((url) => typeof url === "string" && url.startsWith("http"))
      .map((url, i) => ({
        name: `file_${i + 1}`,
        external: { url },
      }));

    // ===== Notion送信 =====
    const res = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        // ★ここはOK（database_id使ってる）
        parent: {
          database_id: DATABASE_ID,
        },

        properties: {
          // ★タイトル（DB側と名前完全一致してる？）
          名前: {
            title: [
              {
                text: {
                  content: title || "無題",
                },
              },
            ],
          },

          // ★日付プロパティ名一致してる？
          日付: {
            date: {
              start: nowISO,
            },
          },

          // ★ここも完全一致が必要
          マルチセレクト: {
            multi_select: (tags.length > 0 ? tags : ["その他"]).map((tag) => ({
              name: tag,
            })),
          },

          // ★プロパティ名「完全一致」注意（全角スペース含む）
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

    // ★URL確認（これ重要）
    console.log("NOTION URL:", res.data.url);

  } catch (err) {
    console.error("Notion error:", err.response?.data || err);
  }
}

module.exports = { saveMsgToNotion };
