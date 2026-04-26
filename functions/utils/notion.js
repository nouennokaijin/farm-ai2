// utils/notion.js
// 


// utils/notion.js
/*
const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createPage(title, content, tag) {
  console.log("NOTION CONTENT:", content);

  // 🇯🇵 日本時間を正確に生成（ズレ防止）
  const now = new Date();

  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  const bodyText = `【${displayTime}】\n${content || ""}`;

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
*/

// utils/notion.js

const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createPage(title, content) {
  const now = new Date();

  const nowJP = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  const nowISO = nowJP.toISOString();
  const displayTime = nowJP.toLocaleString("ja-JP");

  const bodyText = `【${displayTime}】\n${content || ""}`;

  try {
    const res = await axios.post(
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

    // 👇 これが今回の目的
    console.log("NOTION URL:", res.data.url);

  } catch (err) {
    console.error("Notion error:", err.response?.data || err);
  }
}

module.exports = { createPage };
