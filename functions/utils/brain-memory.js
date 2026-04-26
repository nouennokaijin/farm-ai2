// brain-memory.js

const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function fetchMemory(limit = 10) {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    page_size: limit,
  });

  return res.results.map((page) => ({
    id: page.id,
    title: page.properties?.名前?.title?.[0]?.plain_text || "",
    content: page.properties?.内容?.rich_text?.[0]?.plain_text || "",
  }));
}

async function buildMemoryContext(limit = 10) {
  const memories = await fetchMemory(limit);

  return memories.map(m => `- ${m.title}: ${m.content}`).join("\n");
}

module.exports = {
  fetchMemory,
  buildMemoryContext,
};

