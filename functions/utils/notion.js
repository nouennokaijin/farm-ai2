
// utils/notion.js
// 2026/4/24
// Kazuo Okiura

// Notion APIにリクエスト送るためのライブラリ
const axios = require("axios");

// 環境変数からAPIキーとDB IDを取得
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Notionにページを作る関数
// title: タイトル（必須）
// content: 今回は未使用（あとで拡張できる
async function createPage(title, content, tag) {
  console.log("NOTION CONTENT:", content);
  // Notionに新しいページを作成するリクエスト
  await axios.post(
    "https://api.notion.com/v1/pages",
    {
      // どのデータベースに作るか
      parent: { database_id: DATABASE_ID },

      properties: {
        // 「名前」プロパティ（タイトル欄）
        名前: {
          title: [
            {
              text: {
                // タイトルが空なら「無題」を入れる
                content: title || "無題",
              },
            },
          ],
        },
      },
    },
    {
      headers: {
        // 認証ヘッダー（これがないとNotionに拒否される）
        Authorization: `Bearer ${NOTION_API_KEY}`,

        // Notion APIのバージョン指定
        "Notion-Version": "2022-06-28",

        // JSON送信
        "Content-Type": "application/json",
      },
    }
  );
}

// 他のファイルから使えるようにする
module.exports = { createPage };

