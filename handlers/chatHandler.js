// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : chatHandler.js
// 📅 DATE : 2026-06-21
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// chatHandler（人格 + 会話エンジン）
//
// ・入力受付のみ
// ・retrievalServiceでContext生成
// ・llmClientで会話生成
// ・返信送信
//
// 🎯 設計思想
// chatHandlerは“入口と出口だけ”
// ロジックはすべてservicesへ移譲
// ========================================

// 🧠 retrievalService（記憶＋検索＋Context生成）
const retrievalService = require("../services/retrievalService");

// 🧠 llmClient（LLM生成エンジン）
const llmClient = require("../units/llmClient");

// ========================================
// MAIN
// ========================================
async function chatHandler(event) {
try {

// 🧠 入力テキスト抽出
const text = extractText(event);

// 🧠 空入力ガード
if (!text) return;

// 🧠 人格ID取得（デフォルト system）
const personaId = event.personaId || "system";

// 🧠 モード取得（chat / meeting など）
const mode = event.mode || "chat";

// 🧠 セッションID生成
const sessionId =
  event.session_id ||
  event.channelId ||
  "default";

// ====================================
// 🧠 ① Retrieval（記憶＋検索＋Context生成）
// ====================================
const context = await retrievalService.build({
  roomId: event.roomId || event.channelId || "default",
  personaId,
  query: text,
  session: event.session
});

// ====================================
// 🧠 ② LLM生成（llmClient）
// ====================================
const responseRaw = await llmClient.chat(context, {
  max_tokens: 120
});

// ====================================
// 🧠 ③ 返信送信
// ====================================
await safeReply(event, responseRaw);

// ====================================
// 🧠 ④ dispatcherログ用返却
// ====================================
return responseRaw;

} catch (err) {

// 🧠 エラーハンドリング
console.error("[ERROR] chatHandler", err);

}
}

// ========================================
// Utils（変更なし）
// ========================================

// 🧠 テキスト抽出ユーティリティ
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

// 🧠 安全返信ユーティリティ
async function safeReply(event, text) {
if (!text) return;

if (event.reply) return await event.reply(text);
if (event.channel?.send) return await event.channel.send(text);
}

// 🧠 export
module.exports = chatHandler;
