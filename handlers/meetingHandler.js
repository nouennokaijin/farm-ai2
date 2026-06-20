// ========================================
// FILE: meetingHandler.js
// VERSION: v2 (state-machine / turn-based)
// PURPOSE:
//  - 会議を「1ターンずつ進めるエンジン」へ再設計
//  - DB(turn_no)が進行を制御する唯一の状態源
//  - dispatcherは毎回この関数を呼ぶだけ
// ========================================

const { writeLog } = require("../core/logWriter");
const AIService = require("../services/AIService");
const db = require("../core/db");


// ========================================
// 役割：特定人格の発言生成
// ========================================
async function generateProposal(personaId, topic) {
  // 👉 1人格分の意見を生成する

  const prompt = `
あなたはナザリックの守護者「${personaId}」。

議題:
${topic}

必ずJSONで回答せよ：
{
  "persona": "${personaId}",
  "proposal": ""
}
`;

  const result = await AIService.generate({
    personaId,
    prompt
  });

  // 👉 生データをそのまま返す（解析は上位層）
  return result;
}


// ========================================
// デミウルゴス（批判生成）
// ========================================
async function generateCritique(topic, proposals) {
  // 👉 全員の提案をまとめて批判する（1回のみ）

  const prompt = `
あなたはデミウルゴス。

議題:
${topic}

以下の提案を論理的に破壊せよ：

${JSON.stringify(proposals, null, 2)}
`;

  return await AIService.generate({
    personaId: "demiurge",
    prompt
  });
}


// ========================================
// アルベド（統合）
// ========================================
async function generateFinal(topic, proposals, critique) {
  // 👉 批判を踏まえて最終案を作る

  const prompt = `
あなたはアルベド。

議題:
${topic}

提案:
${JSON.stringify(proposals, null, 2)}

批判:
${critique}

最終意思決定をJSONで出力：
{
  "final": []
}
`;

  return await AIService.generate({
    personaId: "albedo",
    prompt
  });
}


// ========================================
// メイン：1ターン実行エンジン
// ========================================
async function meetingHandler(event) {
  try {

    // ===============================
    // 1. 基本情報取得
    // ===============================
    const roomId = event.channelId;
    const taskId = event.task_id;
    const topic = event.text;

    // 👉 会議の進行状態をDBから取得
    const taskRes = await db.query(
      `SELECT status FROM tasks WHERE id = $1`,
      [taskId]
    );

    const roomRes = await db.query(
      `SELECT status FROM rooms WHERE room_id = $1`,
      [roomId]
    );

    // ===============================
    // 2. 現在のターン取得
    // ===============================
    const turnRes = await db.query(
      `SELECT COALESCE(MAX(turn_no), 0) + 1 AS next_turn
       FROM conversation_logs
       WHERE task_id = $1`,
      [taskId]
    );

    const turn_no = turnRes.rows[0].next_turn;

    // ===============================
    // 3. 出席者取得
    // ===============================
    const membersResult = await db.query(
      `SELECT persona_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    const guardians = membersResult.rows.map(r => r.persona_id);

    // ===============================
    // 4. ターン制制御（ここが核心）
    // ===============================

    // 発言順序をDBベースで固定
    const speaker = guardians[(turn_no - 1) % guardians.length];

    console.log("================================");
    console.log("MEETING TURN EXECUTION");
    console.log("ROOM:", roomId);
    console.log("TASK:", taskId);
    console.log("TURN:", turn_no);
    console.log("SPEAKER:", speaker);
    console.log("================================");

    // ===============================
    // 5. フェーズ制御
    // ===============================

    let output = null;
    let tags = [];

    // -------------------------------
    // A) 守護者ターン（通常発言）
    // -------------------------------
    if (speaker !== "demiurge" && speaker !== "albedo") {

      output = await generateProposal(speaker, topic);
      tags = ["proposal"];

    }

    // -------------------------------
    // B) デミウルゴス（批判フェーズ）
    // ※全員分終わった後に呼ばれる想定
    // -------------------------------
    if (speaker === "demiurge") {

      // 👉 過去発言取得
      const history = await db.query(
        `SELECT message FROM conversation_logs
         WHERE task_id = $1 AND tags @> ARRAY['proposal']`,
        [taskId]
      );

      output = await generateCritique(topic, history.rows);
      tags = ["critique"];
    }

    // -------------------------------
    // C) アルベド（最終統合）
    // -------------------------------
    if (speaker === "albedo") {

      const history = await db.query(
        `SELECT message FROM conversation_logs
         WHERE task_id = $1`,
        [taskId]
      );

      const critique = history.rows.filter(r => r.message.includes("critique"));
      const proposals = history.rows.filter(r => r.message.includes("proposal"));

      output = await generateFinal(topic, proposals, critique);
      tags = ["final"];
    }

    // ===============================
    // 6. ログ保存（単一ターン）
    // ===============================
    await writeLog({
      task_id: taskId,
      room_id: roomId,
      persona_id: speaker,
      source: "meeting",
      speaker: "ai",
      message: output,
      turn_no,
      tags
    });

    // ===============================
    // 7. タスク進行更新
    // ===============================
    await db.query(
      `UPDATE tasks SET updated_at = now() WHERE id = $1`,
      [taskId]
    );

    // ===============================
    // 8. 返却（1ターンだけ）
    // ===============================
    return {
      task_id: taskId,
      room_id: roomId,
      turn_no,
      speaker,
      output
    };

  } catch (err) {

    console.error("MEETING ERROR:", err);

    return {
      error: true,
      message: "meetingHandler v2 failed"
    };
  }
}

module.exports = meetingHandler;
