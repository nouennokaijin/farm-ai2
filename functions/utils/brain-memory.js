// brain-memory.js

const { Client } = require("@notionhq/client");

// Notion設定
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// メモリ取得
async function fetchMemory(limit = 20) {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    sorts: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
    page_size: limit,
  });

  return res.results.map((page) => ({
    id: page.id,
    title: page.properties?.Title?.title?.[0]?.plain_text || "",
    content: page.properties?.Content?.rich_text?.[0]?.plain_text || "",
    type: page.properties?.Type?.select?.name || "",
    date: page.properties?.Date?.date?.start || "",
  }));
}

// メモリ保存
async function saveMemory({ title, content, type = "memory" }) {
  const res = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Title: {
        title: [{ text: { content } }],
      },
      Type: {
        select: { name: type },
      },
      Date: {
        date: { start: new Date().toISOString() },
      },
      Content: {
        rich_text: [{ text: { content } }],
      },
    },
  });

  return res.id;
}

// 検索
async function searchMemory(keyword) {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      or: [
        {
          property: "Title",
          title: {
            contains: keyword,
          },
        },
        {
          property: "Content",
          rich_text: {
            contains: keyword,
          },
        },
      ],
    },
  });

  return res.results.map((page) => ({
    id: page.id,
    title: page.properties?.Title?.title?.[0]?.plain_text || "",
    content: page.properties?.Content?.rich_text?.[0]?.plain_text || "",
  }));
}

// AI用コンテキスト生成
async function buildMemoryContext(limit = 10) {
  const memories = await fetchMemory(limit);

  return memories
    .map((m) => `- ${m.title}: ${m.content}`)
    .join("\n");
}

module.exports = {
  fetchMemory,
  saveMemory,
  searchMemory,
  buildMemoryContext,
};
