// ========================================
// 📁 FILE: meetingHandler.js
// 📂 FOLDER: handlers
// 📅 DATE: 2026-06-20
// 👤 AUTHOR: OKIURA KAZUO
// ========================================
//
// 🧠 PURPOSE
// Turn-based AI meeting controller (HARD SAFE VERSION)
//
// ・room単位の排他制御（暴走防止）
// ・dispatcherによる発言順制御
// ・memoryServiceによる統一生成
// ・commitで状態確定
//
// ⚠️ DESIGN NOTES
// ・並列実行を完全抑制
// ・二重起動を防ぐロック機構
// ・失敗しても必ずロック解除
// ========================================


// ========================================
// 📦 IMPORTS
// ========================================
const memoryService = require("../services/memoryService"); // AI生成レイヤー
const dispatcher = require("../core/dispatcher"); // 会議制御コア


// ========================================
// 🧠 ROOM LOCK (重要：同時実行防止)
// ========================================
const roomLocks = new Map(); // roomId単位でロック状態管理


// ========================================
// 🪑 MAIN ENTRY FUNCTION
// ========================================
async function handleMeeting({
  roomId,     // 会議ルームID
  personaId,  // 発言する人格ID
  text,       // ユーザー入力 or 前発言
  sessionId,  // セッションID
  event       // Discordイベントなど
}) {

  // ========================================
  // 🚫 ① ROOM LOCK CHECK
  // ========================================
  if (roomLocks.get(roomId)) { // すでに処理中ならスキップ
    console.log("🛑 ROOM LOCK ACTIVE - SKIP:", roomId); // スキップログ
    return; // 何もしないで終了
  }

  // ========================================
  // 🔒 ② LOCK ACQUIRE
  // ========================================
  roomLocks.set(roomId, true); // このroomをロック

  try {

    // ========================================
    // 🧾 ③ INPUT LOG
    // ========================================
    console.log("================================"); // 区切り線
    console.log("🪑 MEETING HANDLER START"); // 開始ログ
    console.log("ROOM ID:", roomId); // room確認
    console.log("PERSONA:", personaId); // 発言者
    console.log("TEXT:", text); // 入力内容
    console.log("================================"); // 区切り線

    // ========================================
    // 🧭 ④ DISPATCHER ROUTE (次の流れ決定)
    // ========================================
    let next = null; // 次の人格・ターン情報

    try {
      next = await dispatcher.route({ // 順序制御を取得
        roomId,     // room指定
        personaId,  // 現在人格
        text,       // 発言内容
        sessionId,  // session
        event       // event
      });
    } catch (err) {
      console.error("❌ dispatcher.route ERROR:", err); // エラー記録
      next = null; // fallback
    }

    // ========================================
    // 🧠 ⑤ AI RESPONSE GENERATION
    // ========================================
    let response = ""; // 出力初期化

    try {
      response = await memoryService.run({ // AI生成実行
        text,        // 入力
        personaId,   // 人格
        sessionId,   // session
        mode: "meeting", // 会議モード
        event        // event
      });
    } catch (err) {
      console.error("❌ memoryService.run ERROR:", err); // 生成失敗ログ
      response = "（応答生成に失敗しました）"; // fallback応答
    }

    // ========================================
    // 🔁 ⑥ COMMIT STATE BACK TO DISPATCHER
    // ========================================
    try {
      await dispatcher.commit({ // 状態更新確定
        roomId,     // room
        personaId,  // 発言者
        response,   // 出力
        sessionId,  // session
        next        // 次ターン情報
      });
    } catch (err) {
      console.error("❌ dispatcher.commit ERROR:", err); // commit失敗ログ
    }

    // ========================================
    // 📤 ⑦ RETURN RESPONSE
    // ========================================
    return response; // 呼び出し元へ返却

  } finally {

    // ========================================
    // 🔓 ⑧ ALWAYS RELEASE LOCK
    // ========================================
    roomLocks.set(roomId, false); // 必ずロック解除
  }
}


// ========================================
// 📤 EXPORT
// ========================================
module.exports = {
  handleMeeting // 外部公開
};
