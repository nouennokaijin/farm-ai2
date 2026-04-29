// utils/tagger.js

const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===== 許可タグ（ここだけ触れば全体に効く）=====
const ALLOWED_TAGS = [
  "投稿",
  "経費",
  "予定",
  "会話",
  "農業",
  "SNS",
  "重要",
  "その他",
];

// ===== 同義語マップ（揺れ吸収）=====
const SYNONYM_MAP = {
  // 経費系
  "レシート": "経費",
  "領収書": "経費",
  "支出": "経費",

  // 投稿系
  "ポスト": "投稿",
  "ツイート": "投稿",

  // 予定系
  "スケジュール": "予定",
  "予定表": "予定",

  // 会話系
  "雑談": "会話",
  "チャット": "会話",
};

// ===== 正規化（トリム＋同義語変換＋許可チェック）=====
function normalizeTags(rawTags = []) {
  const result = [];

  for (let t of rawTags) {
    if (!t) continue;

    // 余分な空白削除
    t = String(t).trim();

    // 同義語変換
    if (SYNONYM_MAP[t]) {
      t = SYNONYM_MAP[t];
    }

    // 許可タグのみ通す
    if (ALLOWED_TAGS.includes(t)) {
      if (!result.includes(t)) {
        result.push(t);
      }
    }
  }

  // 1個も残らなければ「その他」
  if (result.length === 0) {
    return ["その他"];
  }

  // 最大3個まで（暴走防止）
  return result.slice(0, 3);
}

// ===== AIタグ生成（複数タグをカンマ区切りで返す想定）=====
async function generateTags(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "次のタグから最大3つ、カンマ区切りで返す：投稿, 経費, 予定, 会話, 農業, SNS, 重要。不明はその他。",
        },
        {
          role: "user",
          content: text || "",
        },
      ],
    });

    const raw = res?.choices?.[0]?.message?.content || "";

    // カンマ区切りで配列化
    const rawTags = raw.split(",").map(t => t.trim());

    // 正規化
    return normalizeTags(rawTags);

  } catch (err) {
    console.error("tagger error:", err);
    return ["その他"];
  }
}

module.exports = {
  generateTags,
  normalizeTags,
  ALLOWED_TAGS,
};
