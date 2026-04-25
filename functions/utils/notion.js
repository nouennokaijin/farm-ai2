
// utils/notion.js
// 2026/4/25
// Kazuo Okiura

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createPage(title, content, tag) {
  console.log("NOTION CONTENT:", content);

  // 現在日時（ISOと日本語表示の両方用意）
  const nowISO = new Date().toISOString();
  const nowJP = new Date().toLocaleString("ja-JP");

  // 本文に入れるテキスト（日時付き）
  const bodyText = `【${nowJP}】\n${content || ""}`;

  await axios.post(
    "https://api.notion.com/v1/pages",
    {
      parent: { database_id: DATABASE_ID },

      properties: {
        // タイトル（一覧用）
        名前: {
          title: [
            {
              text: {
//                content: title || (content ? content.slice(0, 20) : "無題"),
content: "テスト投稿",

              },
            },
          ],
        },

        // 日付プロパティ（←Notion側で「Date」型にしておく）
        Date: {
          date: {
            start: nowISO,
          },
        },
      },

      // 👇 ここが今回のキモ（ページ本文）
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
}

module.exports = { createPage };
