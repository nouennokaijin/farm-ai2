// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : chatHandler.js (TEST MODE)
// 📅 DATE : 2026-06-14
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧪 TEST MODE
// ・memoryService完全バイパス
// ・固定レスポンス返却
// ・疎通確認専用
//
// ========================================

// ========================================
// MAIN
// ========================================
async function chatHandler(event) {
  try {
    console.log("[TEST] chatHandler triggered");

    const text = extractText(event);
    console.log("[TEST] received text:", text);

    const personaId = event?.personaId || "system";
    const sessionId =
      event?.session_id ||
      event?.channelId ||
      "default";

    console.log("[TEST] sessionId:", sessionId);
    console.log("[TEST] personaId:", personaId);

    // ====================================
    // 🧪 FIXED RESPONSE ONLY
    // ====================================
    const responseRaw = "こんにちわ";

    // ====================================
    // Reply
    // ====================================
    await safeReply(event, responseRaw);

    console.log("[TEST] reply sent");

  } catch (err) {
    console.error("[ERROR] chatHandler", err);
  }
}

// ========================================
// Utils
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

  console.log("[WARN] No reply method found. Output:", text);
}

module.exports = chatHandler;
