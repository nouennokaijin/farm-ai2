// ========================================
// 📁 FILE: llmClient.js
// 📂 FOLDER: units
// 📅 DATE : 2026-06-21
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// llmClient（LLM実行ユニット）
//
// ・Context → Prompt変換
// ・groqServiceラップ
// ・会話履歴統合
// ・Web検索統合
// ・LLM送信前ログ
// ・LLM応答後ログ
//
// ========================================

const groqService = require("../services/groqService");

// ========================================
// 🧠 Prompt構築
// ========================================
function buildPrompt(context) {

  // ====================================
  // Context取得
  // ====================================
  const logs =
    context?.db || [];

  const web =
    context?.web || [];

  const drive =
    context?.drive || [];

  const userInput =
    context?.query || "No user input.";

  // ====================================
  // 会話履歴整形
  // ====================================
//  const recentLogs =
//    logs.length > 0
//      ? logs
//          .map(
//            log =>
//              `[${log.speaker}] ${log.message}`
//         )
//          .join("\n")
//      : "No conversation history.";

    const recentLogs =
      logs.length > 0
        ? [...logs]
                .reverse()
                .map(
                  log =>
                    `[${log.speaker}] ${log.message}`
          )
           .join("\n")
        : "No conversation history.";

  // ====================================
  // Web整形
  // ====================================
  const webText =
    web.length > 0
      ? web
          .map(item => {

            const title =
              item?.title || "";

            const snippet =
              item?.snippet || "";

            return `${title} ${snippet}`.trim();

          })
          .join("\n")
      : "No web data.";

  // ====================================
  // Drive整形
  // ====================================
  const driveText =
    drive.length > 0
      ? JSON.stringify(drive, null, 2)
      : "No drive data.";

  // ====================================
  // System Prompt
  // ====================================
  const system = `
# ROLE
You are an AI assistant.

# INSTRUCTIONS
Use conversation history when relevant.
Use web data only when useful.
Reply naturally.
Keep continuity with previous discussion.
Do not ignore recent user messages.
Avoid repeating old answers unless requested.
`.trim();

  // ====================================
  // User Prompt
  // ====================================
  const user = `
# RECENT LOGS
${recentLogs}

# WEB
${webText}

# DRIVE
${driveText}

# CURRENT USER MESSAGE
${userInput}
`.trim();

  return {
    system,
    user
  };
}

// ========================================
// 🧠 LLM実行
// ========================================
async function chat(
  context,
  options = {}
) {

  const {
    system,
    user
  } = buildPrompt(context);

  // ====================================
  // 🧠 LOG② LLM送信直前
  // ====================================
  console.log("================================");
  console.log("LLM INPUT");
  console.log("QUERY:", context?.query);
  console.log("DB COUNT:", context?.db?.length || 0);
  console.log("WEB COUNT:", context?.web?.length || 0);
  console.log("DRIVE COUNT:", context?.drive?.length || 0);
  console.log("================================");

  try {

    const response =
      await groqService.chat({
        system,
        user,
        max_tokens:
          options.max_tokens || 120
      });

    // ====================================
    // 応答抽出
    // ====================================
    const output =
      typeof response === "string"
        ? response
        : response?.message ||
          response?.content ||
          "";

    // ====================================
    // 🧠 LOG③ 応答生成直後
    // ====================================
    console.log("================================");
    console.log("LLM OUTPUT");
    console.log(output);
    console.log("================================");

    return output;

  } catch (err) {

    console.error(
      "❌ LLMClient error:",
      err
    );

    return "申し訳ありません。応答生成中にエラーが発生しました。";
  }
}

// ========================================
// EXPORT
// ========================================
module.exports = {
  chat
};
