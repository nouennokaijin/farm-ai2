// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : chatHandler.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// chatHandler（人格 + 会話エンジン）
//
// ・入力受付のみ
// ・memoryServiceへ処理委譲
// ・返信送信
//
// 🎯 設計思想
// chatHandlerは“入口と出口だけ”
// ロジックはすべてservicesへ移譲
//
// ========================================

const memoryService = require("../services/memoryService");

// ========================================
// MAIN
// ========================================
async function chatHandler(event) {
  try {
    const text = extractText(event);
    if (!text) return;

    const personaId = event.personaId || "system";
    const mode = event.mode || "chat";

    const sessionId =
      event.session_id ||
      event.channelId ||
      "default";

    // ====================================
    // 🧠 Core Pipeline（全処理委譲）
    // ====================================
    const responseRaw = await memoryService.run({
      text,
      personaId,
      mode,
      sessionId,
      event
    });

    // ====================================
    // Reply
    // ====================================
    await safeReply(event, responseRaw);

  } catch (err) {
    console.error("[ERROR] chatHandler", err);
  }
}

// ========================================
// Utils（変更なし）
// ========================================

function extractText(event) {
  if (!event) return "";
  if (typeof event === "string") return event;

  return (
    event.content ||
    event.text ||
    event.message?.content ||
    event.data?.content ||
    ""
  );
}

async function safeReply(event, text) {
  if (!text) return;

  if (event.reply) return await event.reply(text);
  if (event.channel?.send) return await event.channel.send(text);
}

module.exports = chatHandler;
