// utils/tagger.js
// 2026/5/2
// Okiura Kazuo
// 目的：
// ① システムタグを必ず1つ
// ② 意味タグを最大2つ
// ③ 順序を固定して返す

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================================
// 🎯 システムタグ（固定）
// ================================
const SYSTEM_TAGS = [
  "投稿",
  "レシート",
  "OCR",
  "予定",
  "チャット",
];

// ================================
// 🧠 システムタグ判定（AI）
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

投稿, レシート, OCR, 予定, チャット

不明な場合は「チャット」
余計な説明は禁止
          `,
        },
        { role: "user", content: text || "" },
      ],
    });

    const tag = res?.choices?.[0]?.message?.content?.trim();

    // 念のためチェック
    if (SYSTEM_TAGS.includes(tag)) {
      return tag;
    }

    return "チャット";

  } catch (e) {
    console.error("system tag error:", e);
    return "チャット";
  }
}

// ================================
// 🌱 意味タグ生成（AI）
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

【ルール】
・名詞
・日本語
・カンマ区切り
・具体的（例：農業, トマト, 成長）
・システムタグは禁止（投稿などは出さない）
          `,
        },
        { role: "user", content: text || "" },
      ],
    });

    const raw = res?.choices?.[0]?.message?.content || "";

    return raw
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

  } catch (e) {
    console.error("topic tag error:", e);
    return [];
  }
}

// ================================
// 🧹 意味タグの整形
// ================================
function cleanTopicTags(tags = []) {
  const result = [];

  for (let t of tags) {
    if (!t) continue;

    // システムタグは除外
    if (SYSTEM_TAGS.includes(t)) continue;

    // 重複排除
    if (!result.includes(t)) {
      result.push(t);
    }
  }

  return result;
}

// ================================
// 🎯 メイン統合関数
// ================================
async function buildTags({ text = "", type = "" }) {

  // ================================
  // ① システムタグ確定
  // ================================

  let systemTag = "チャット";

  // typeが指定されていればそれを優先（handlerから渡す）
  if (type && SYSTEM_TAGS.includes(type)) {
    systemTag = type;
  } else {
    systemTag = await detectSystemTag(text);
  }

  // ================================
  // ② 意味タグ生成
  // ================================
  const rawTopicTags = await generateTopicTags(text);

  // 整形
  const topicTags = cleanTopicTags(rawTopicTags);

  // ================================
  // ③ 最終構成（順序固定）
  // ================================
  return [
    systemTag,
    ...topicTags.slice(0, 2) // 最大2つ
  ];
}

module.exports = {
  buildTags,
  generateTopicTags,
  detectSystemTag,
  SYSTEM_TAGS,
};
