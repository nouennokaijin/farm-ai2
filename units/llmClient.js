// ========================================
// 📁 FOLDER : units
// 📄 FILE : llmClient.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// llmClient（LLM呼び出し専用ユニット）
//
// ・groqServiceラッパー
// ・将来的にモデル切替可能にする層
//
// ========================================

const groqService = require("../services/groqService");

async function chat({ system, user, max_tokens = 120 }) {
  try {
    const res = await groqService.chat({
      system,
      user,
      max_tokens
    });

    return res;
  } catch (err) {
    console.error("❌ LLMClient error:", err);
    return "";
  }
}

module.exports = {
  chat
};
