// utils/notion.js

const axios = require("axios");
const { buildMemoryContext } = require("./brain-memory");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createPage(title, content, tag) {
  console.log("NOTION CONTENT:", content);

  // 🇯🇵 日本時間
  const now = new Date();
  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  // 🧠 記憶を取得（追加）
  const memory = await buildMemoryContext(5);

  const bodyText = `【${displayTime}】\n${content || ""}`;

  // 🧠 記憶ログも一緒に保存（ノート化）
  const memoryText = memory
    ? `\n\n🧠MEMORY:\n${memory}`
    : "\n\n🧠MEMORY:（なし）";

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
                  content: bodyText + memoryText,
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
