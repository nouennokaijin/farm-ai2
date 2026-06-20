// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : meetingHandler.js（state-machine v3）
// 📅 DATE : 2026-06-20
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// 円卓会議エンジン（完全ターン制）
/*
・DB(turn_no)が唯一の進行状態
・1リクエスト = 1人格の発言
・memoryServiceで思考生成
・dispatcherが毎回呼び出す前提
*/
// ========================================

// ========================================
// 外部依存
// ========================================
const { run: memoryService } = require("../services/memoryService"); // ← 実在する思考エンジン
const db = require("../core/db"); // ← PostgreSQL接続
const { writeLog } = require("../core/logWriter"); // ← ログ保存

// ========================================
// メイン処理
// ========================================
async function meetingHandler(event) { // ← dispatcherから呼ばれる入口関数

  try { // ← 例外安全ブロック開始

    // ====================================
    // 1. 入力情報取得
    // ====================================
    const roomId = event.channelId; // ← Discordの部屋ID
    const taskId = event.task_id; // ← 会議タスクID
    const topic = event.text; // ← 議題（入力そのまま）

    // ====================================
    // 2. 出席者一覧取得（DB基準）
    // ====================================
    const membersResult = await db.query( // ← room_membersから取得
      `SELECT persona_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    const members = membersResult.rows.map(r => r.persona_id); // ← 配列化

    // ====================================
    // 3. 現在ターン取得
    // ====================================
    const turnResult = await db.query( // ← 進行状態取得
      `SELECT COALESCE(MAX(turn_no), 0) + 1 AS next_turn
       FROM conversation_logs
       WHERE task_id = $1`,
      [taskId]
    );

    const turnNo = turnResult.rows[0].next_turn; // ← 次ターン番号

    // ====================================
    // 4. 発言者決定（順番制御）
    // ====================================
    const speaker = members[(turnNo - 1) % members.length]; // ← 順番ループ制御

    // ====================================
    // 5. ログ（開始）
    // ====================================
    console.log("================================"); // ← デバッグ開始
    console.log("MEETING TURN START"); // ← 状態確認
    console.log("ROOM:", roomId); // ← 部屋ID
    console.log("TASK:", taskId); // ← タスクID
    console.log("TURN:", turnNo); // ← ターン番号
    console.log("SPEAKER:", speaker); // ← 発言者
    console.log("================================"); // ← 区切り

    // ====================================
    // 6. 思考生成（memoryService呼び出し）
    // ====================================
    const response = await memoryService({ // ← AI生成本体
      text: topic, // ← 議題を入力
      personaId: speaker, // ← 現在の発言者
      mode: "meeting", // ← 会議モード
      sessionId: taskId, // ← セッションID
      event // ← 元イベント
    });

    // ====================================
    // 7. ログ保存（発言）
    // ====================================
    await writeLog({ // ← 会話ログ永続化
      task_id: taskId, // ← タスク紐付け
      room_id: roomId, // ← 部屋紐付け
      persona_id: speaker, // ← 発言者
      source: "meeting", // ← 会議ソース
      speaker: "ai", // ← AI発言
      message: response, // ← 生成結果
      turn_no: turnNo, // ← ターン番号
      tags: ["meeting"] // ← メタタグ
    });

    // ====================================
    // 8. タスク状態更新
    // ====================================
    await db.query( // ← 更新（進行記録）
      `UPDATE tasks SET updated_at = now() WHERE id = $1`,
      [taskId]
    );

    // ====================================
    // 9. レスポンス返却（1ターンのみ）
    // ====================================
    return { // ← dispatcherへ返す
      task_id: taskId, // ← タスクID
      room_id: roomId, // ← 部屋ID
      turn_no: turnNo, // ← ターン番号
      speaker, // ← 発言者
      message: response // ← 出力
    };

  } catch (err) { // ← エラーハンドリング開始

    // ====================================
    // 10. エラーログ
    // ====================================
    console.error("MEETING ERROR:", err); // ← 標準エラー出力

    // ====================================
    // 11. フォールバック応答
    // ====================================
    return { // ← 最低限返す
      error: true, // ← エラーフラグ
      message: "meetingHandler failed" // ← 固定メッセージ
    };

  } // ← try-catch終了

} // ← meetingHandler終了

// ========================================
// export
// ========================================
module.exports = meetingHandler; // ← 外部公開
