// ========================================
// FILE: services/groqService.js
// FOLDER: /services
// DATE: 2026-05-27
// PURPOSE:
//   Groq API 接続サービス
//   AIへメッセージ送信
//   応答生成専用
//
// OVERVIEW:
//   - system / user を受け取りAI生成
//   - max_tokens の安全制御
//   - ログ出力
//   - 校正ステップ削除済み
//
// AUTHOR:
//   OKIURA KAZUO
// ========================================

const Groq = require("groq-sdk");

// ========================================
// Groq Client 初期化
// ========================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ========================================
// chat
// ========================================
// system:
//   システムプロンプト
//
// user:
//   ユーザー入力
//
// max_tokens:
//   応答トークン数
//
// NOTE:
//   校正AIパイプライン削除済み
//   RAW生成のみ返却
// ========================================
async function chat({
  system,
  user,
  max_tokens,
}) {
  try {
    console.log("=================================");
    console.log("🧠 GROQ REQUEST START");
    console.log("=================================");

    // ====================================
    // max_tokens 制御
    // 1〜1200 の範囲のみ許可
    // ====================================
    let tokenLimit;

    if (
      typeof max_tokens === "number" &&
      max_tokens > 0 &&
      max_tokens <= 1200
    ) {
      tokenLimit = max_tokens;
    } else {
      // デフォルト値
      tokenLimit = 30;
    }

    // ====================================
    // AI生成
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

    // ====================================
    // 応答取得
    // ====================================
    const raw =
      res.choices?.[0]?.message?.content || "...";

    // ====================================
    // ログ出力
    // ====================================
    console.log("🟡 RAW RESPONSE:");
    console.log(raw);

    console.log("=================================");
    console.log("✅ RESPONSE COMPLETE");
    console.log("=================================");

    // ====================================
    // RAW応答をそのまま返却
    // ====================================
    return raw;

  } catch (err) {

    console.error("=================================");
    console.error("❌ GROQ SERVICE ERROR");
    console.error("=================================");
    console.error(err);

    return "通信エラーが発生しました。";
  }
}

// ========================================
// export
// ========================================
module.exports = {
  chat,
};
