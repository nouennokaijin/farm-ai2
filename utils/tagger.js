// utils/tagger.js
// 2026/5/2
// タグ設計：システムタグ（日本語固定）＋トピックタグ

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🎯 システムタグ（完全固定）
// ================================
const SYSTEM_TAGS = [
  "投稿",
  "レシート",
  "OCR",
  "予定",
  "チャット",
];

// ================================
// 🧼 正規化ユーティリティ（安全版）
// ================================
function normalizeTag(tag = "") {
  return tag
    .replace(/[。、]/g, "")   // 句読点のみ除去（空白は保持）
    .replace(/\s+/g, " ")    // 複数スペースを1つに統一
    .trim();
}

// ================================
// 🧠 システムタグ判定（AI + 安定化）
// ================================
async function detectSystemTag(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
次のいずれか1つだけ返してください：

投稿 / レシート / OCR / 予定 / チャット

不明なら チャット
余計な説明は禁止
          `,
        },
        { role: "user", content: text || "" },
      ],
    });

    const raw = res?.choices?.[0]?.message?.content || "";

    // ================================
    // 🧼 正規化
    // ================================
    const tag = normalizeTag(raw);

    // ================================
    // 🔒 完全一致チェック（唯一の正解判定）
    // ================================
    return SYSTEM_TAGS.includes(tag) ? tag : "チャット";

  } catch (e) {
    console.error("system tag error:", e);
    return "チャット";
  }
}

// ================================
// 🌱 トピックタグ生成
// ================================
async function generateTopicTags(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `
文章のテーマを表す単語を2〜4個出してください。

ルール：
・名詞
・日本語
・カンマ or 読点区切り
・具体的
・システムタグは禁止
          `,
        },
        { role: "user", content: text || "" },
      ],
    });

    const raw = res?.choices?.[0]?.message?.content || "";

    // ================================
    // 🧠 分割ロジック強化（カンマ・読点・改行対応）
    // ================================
    return raw
      .split(/,|、|\n/)
      .map(t => normalizeTag(t))
      .filter(Boolean);

  } catch (e) {
    console.error("topic tag error:", e);
    return [];
  }
}

// ================================
// 🧹 トピックタグ整理
// ================================
function cleanTopicTags(tags = []) {
  const result = [];

  for (let t of tags) {
    if (!t) continue;

    const normalized = normalizeTag(t);

    // システムタグ除外
    if (SYSTEM_TAGS.includes(normalized)) continue;

    // 重複排除
    if (!result.includes(normalized)) {
      result.push(normalized);
    }
  }

  return result;
}

// ================================
// 🎯 メイン（唯一の入口）
// ================================
async function buildTags({ text = "", type = "" }) {

  // ================================
  // 👑 systemTag（王）
  // ================================
  let systemTag = "チャット";

  // typeがある場合は100%優先（AI禁止）
  if (type && SYSTEM_TAGS.includes(type)) {
    systemTag = type;
  } else {
    systemTag = await detectSystemTag(text);
  }

  // ================================
  // 🤖 topicTags（補助情報）
  // ================================
  const raw = await generateTopicTags(text);
  const topics = cleanTopicTags(raw);

  // ================================
  // 🏷 最終出力（構造固定）
  // ================================
  return [
    systemTag,
    ...topics.slice(0, 2),
  ];
}

// ================================
// 📦 export
// ================================
module.exports = {
  buildTags,
  generateTopicTags,
  detectSystemTag,
  SYSTEM_TAGS,
};
