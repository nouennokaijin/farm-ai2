// ========================================
// FILE: groqService.js
// PURPOSE: Groq API 接続
// ROLE: AIへメッセージ送信
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
// ========================================
async function chat({ system, user, max_tokens }) {
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

			// ====================================
			// TOKEN CONTROL（明示制御済み）
			// ====================================
			max_tokens: tokenLimit,
		});

		const text = res.choices?.[0]?.message?.content || "...";

		console.log("✅ GROQ RESPONSE SUCCESS");
		return text;
	} catch (err) {
		console.error("=================================");
		console.error("❌ GROQ SERVICE ERROR");
		console.error("=================================");
		console.error(err);

		return "通信エラーが発生しました。";
	}
}

module.exports = { chat };
