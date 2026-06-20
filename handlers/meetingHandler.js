// ========================================
// 📁 FILE: handlers/meetingHandler.js
// 📂 FOLDER: handlers
// 📅 DATE: 2026-06-20
// 👤 AUTHOR: OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// 守護者会議システムの1ターン制御ハンドラ
//
// ・発言順制御（turn-based dispatch）
// ・1人ずつdispatcherへ戻す設計前提
// ・conversation_logsへの記録
// ・room_membersベースの順番制御
//
// ⚠️ IMPORTANT
// ・AIService / core/db は存在しないため削除済み
// ・実処理は memoryService + dispatcher に統合
// ========================================


// ========================================
// ❌ REMOVED (存在しないため削除)
// require("../services/AIService")
// require("../core/db")
// ========================================

// 実際に存在するサービスのみ使用
const memoryService = require("../services/memoryService");

// dispatcher（フロー制御の中枢）
const dispatcher = require("../core/dispatcher");

// DBアクセスは dispatcher 側 or session/unit 側に寄せる前提
// ここでは直接DBは触らない設計に修正

// ========================================
// MAIN ENTRY
// ========================================
async function handleMeeting({
  roomId,
  personaId,
  text,
  sessionId,
  event
}) {

  // ========================================
  // ① 入力ログ（受信内容）
  // ========================================
  console.log("================================");
  console.log("MEETING HANDLER START");
  console.log("ROOM ID:", roomId);
  console.log("PERSONA:", personaId);
  console.log("TEXT:", text);
  console.log("================================");

  // ========================================
  // ② dispatcherに制御を委譲
  //    ※ここが「会議の司令塔」
  // ========================================
  const next = await dispatcher.route({
    roomId,
    personaId,
    text,
    sessionId,
    event
  });

  // ========================================
  // ③ persona発言生成
  // ========================================
  // ⚠️ ここでAIServiceは使わない（削除済み設計）
  // → memoryServiceがLLM含む唯一の生成レイヤー

  const response = await memoryService.run({
    text,
    personaId,
    sessionId,
    mode: "meeting",
    event
  });

  // ========================================
  // ④ dispatcherへ戻す（必須設計）
  // ========================================
  // これが重要：
  // 「1人発言 → 必ずdispatcherへ戻る」
  // ループ暴走防止ポイント
  // ========================================
  await dispatcher.commit({
    roomId,
    personaId,
    response,
    sessionId,
    next
  });

  // ========================================
  // ⑤ return
  // ========================================
  return response;
}

// ========================================
// EXPORT
// ========================================
module.exports = {
  handleMeeting
};
