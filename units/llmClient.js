// ========================================
// 📁 FILE: llmClient.js
// 📂 FOLDER: units
// 📅 DATE : 2026-06-20
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// llmClient（LLM実行ユニット）
//
// ・Context → Prompt変換
// ・groqServiceラップ
// ・生成責務の中心層
//
// ========================================

const groqService = require("../services/groqService");

// ========================================
// 🧠 Prompt構築
// ========================================
function buildPrompt(context) {

  const memory = context?.memory || [];
  const web = context?.web || [];
  const logs = context?.db || [];
  const userInput = context?.query || "";

  const system = `
# ROLE
You are an AI assistant.

# MEMORY
${memory.join("\n")}

# RULE
Use memory and web context if needed.
Keep response concise.
`.trim();

  const user = `
# RECENT LOGS
${logs.map(l => `[${l.speaker}] ${l.message}`).join("\n")}

# WEB
${web.map(w => `${w.title || ""}: ${w.snippet || ""}`).join("\n")}

# USER
${userInput}
`.trim();

  return { system, user };
}

// ========================================
// 🧠 LLM実行
// ========================================
async function chat(context, options = {}) {

  const { system, user } = buildPrompt(context);

  try {
    const res = await groqService.chat({
      system,
      user,
      max_tokens: options.max_tokens || 120
    });

    return res;

  } catch (err) {
    console.error("❌ LLMClient error:", err);
    return "";
  }
}

// ========================================
// export
// ========================================
module.exports = {
  chat
};
