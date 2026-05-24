// ========================================
// FILE: groqService.js
// PURPOSE: Groq API 接続
// ROLE: AIへメッセージ送信（生成 + 校正パイプライン）
// AUTHOR: OKIURA KAZUO
// ========================================

const Groq = require("groq-sdk");

const client = new Groq({
apiKey: process.env.GROQ_API_KEY,
});

// ========================================
// chat
// ========================================
// system: システムプロンプト
// user: ユーザーメッセージ
// max_tokens: 応答トークン制御（任意）
// usePolish: 校正AIを通すかどうか（デフォルト true）
// ========================================
async function chat({ system, user, max_tokens, usePolish = true }) {
try {
console.log("=================================");
console.log("🧠 GROQ REQUEST START");
console.log("=================================");

// ====================================
// max_tokens 制御（明示 if ロジック）
// トークンは正の整数で 1〜1200 の間のみ許可
// ====================================
let tokenLimit;

if (
typeof max_tokens === "number" &&
max_tokens > 0 &&
max_tokens <= 1200
) {
tokenLimit = max_tokens;
} else {
tokenLimit = 30; // デフォルト値
}

// ====================================
// ① まず通常生成（RAW出力）
// ====================================
const res = await client.chat.completions.create({
model: "meta-llama/llama-4-scout-17b-16e-instruct",
messages: [
{
role: "system",
content: system,
},
{
role: "user",
content: user,
},
],
max_tokens: tokenLimit,
});

const raw = res.choices?.[0]?.message?.content || "...";

console.log("🟡 RAW RESPONSE:");
console.log(raw);

// ====================================
// ② 校正ステップ（Polish AI）
// ====================================
if (!usePolish) {
console.log("⚪ POLISH SKIPPED");
return raw;
}

const polishedRes = await client.chat.completions.create({
model: "meta-llama/llama-4-scout-17b-16e-instruct",
messages: [
{
role: "system",
content: `
あなたは文章校正AIです。
以下のルールで修正してください：

- 返答は絶対に行わない
- 文章の意味を変えない
- 文法を正しく
- 自然な文章
`,
},
{
role: "user",
content: raw,
},
],
max_tokens: tokenLimit,
});

const polished =
polishedRes.choices?.[0]?.message?.content || raw;

console.log("✅ POLISH COMPLETE");
console.log("=================================");

return polished;
} catch (err) {
console.error("=================================");
console.error("❌ GROQ SERVICE ERROR");
console.error("=================================");
console.error(err);

return "通信エラーが発生しました。";
}
}

module.exports = { chat };
