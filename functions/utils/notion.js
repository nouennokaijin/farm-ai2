// utils/notion.js

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ===== Notionページ作成 =====
// title: タイトル
// content: 本文
// files: 画像やファイルのURL配列（任意・外部公開URLのみ）
async function createPage(title, content, files = []) {
  const now = new Date();

  // 日本時間に変換（ズレ防止）
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  // 本文生成
  const bodyText = `【${displayTime}】\n${content || ""}`;

  try {
    // ===== ファイルプロパティ生成 =====
    // Notionの「ファイル & メディア」形式に変換
    const fileProperty = (files || [])
      .filter((url) => typeof url === "string" && url.startsWith("http")) // URLチェック
      .map((url, i) => ({
        name: `file_${i + 1}`,
        external: {
          url: url,
        },
      }));

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

          // ===== ファイル & メディア =====
          // Notion側のプロパティ名と完全一致させる
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

    // 作成されたページURL
    console.log("NOTION URL:", res.data.url);
  } catch (err) {
    // エラー詳細出力
    console.error("Notion error:", err.response?.data || err);
  }
}

module.exports = { createPage };
