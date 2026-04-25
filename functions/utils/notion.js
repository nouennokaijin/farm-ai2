// notion,js

// utils/notion.js

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createPage(title, content, tag) {
  console.log("NOTION CONTENT:", content);

  const nowISO = new Date().toISOString();
  const nowJP = new Date().toLocaleString("ja-JP");
  const bodyText = `【${nowJP}】\n${content || ""}`;

  await axios.post(
    "https://api.notion.com/v1/pages",
    {
      parent: { database_id: DATABASE_ID },

      properties: {
        名前: {
          title: [
            {
              text: {
                content: title || "無題",
              },
            },
          ],
        },

        // 👇 ここ追加（プロパティ名はNotionと完全一致）
        日付: {
          date: {
            start: nowISO,
          },
        },
      },

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
