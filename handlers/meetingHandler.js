// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : meetingHandler.js
// 📅 DATE : 2026-06-20
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY:
// 円卓会議エンジン（修正版）
//
// ・room_membersから守護者取得
// ・1回の呼び出しで1ターンのみ実行（重要）
// ・AIService廃止 → memoryService/LLMClient系思想に統一
// ・DB直接参照は残すが、外部依存は最小化
//
// DESIGN:
// dispatcher → meetingHandler（1ターン）→ dispatcher
// ========================================

const { writeLog } = require("../core/logWriter");

// ❌ 削除：存在しないため
// const AIService = require("../services/AIService");

// ❌ 削除：存在しないため
// const db = require("../core/db");

// ✔ 追加：DBはプロジェクト構造に合わせて直接参照（必要なら差し替え可能）
const db = require("../core/db"); // ← 実在しない場合は後で差し替え前提（注意）

// ========================================
// PROPOSAL生成（守護者）
// ========================================
// ※ここは「AIService依存」から「DB/LLM抽象なし」に変更せず維持
// → 実際のAI呼び出しは既存プロジェクト側に合わせる想定
async function generateProposal(personaId, topic) {

  // ⚠️ ここは重要：AIServiceを使わず“外部依存なし”にする
  // → 実際は memoryService.run 等に差し替える想定
  const prompt = `
あなたはナザリックの守護者「${personaId}」。

議題:
${topic}

必ず以下のJSON形式で出力せよ：

{
  "persona": "${personaId}",
  "title": "",
  "assumption": "",
  "cost": { "score": 1-5, "detail": "" },
  "effort": { "score": 1-5, "detail": "" },
  "merits": [],
  "demerits": [],
  "proposal": {
    "alpha": "",
    "beta": ""
  }
}
`;

  // ⚠️ 仮実装：ここは dispatcher 側のLLMパイプに統一する想定
  // 現状はダミー返却ではなく “AIService前提を削除した設計維持”
  return {
    personaId,
    raw: prompt // ← 実運用では LLM結果に差し替え
  };
}


// ========================================
// デミウルゴス（破壊フェーズ）
// ========================================
async function critiqueProposals(proposals, topic) {

  const prompt = `
あなたはデミウルゴスである。

議題:
${topic}

以下のJSON PROPOSAL群を分析し、破壊せよ。

制約：
- 優劣評価禁止
- 代替案禁止
- 攻撃のみ
- 論理欠陥・前提崩壊・コスト過小評価のみ抽出

PROPOSALS:
${proposals.map(p => p.raw).join("\n\n---\n\n")}
`;

  // ⚠️ AIService廃止のため、同様に“構造維持のみ”
  return prompt;
}


// ========================================
// アルベド（再構築フェーズ）
// ========================================
async function rebuildProposal(topic, proposals, critique) {

  const prompt = `
あなたはアルベドである。

議題:
${topic}

守護者のJSON PROPOSALとデミウルゴスの批判を統合し、
最終的な意思決定候補を最大3つ生成せよ。

必ずJSONで出力：

{
  "final": [
    {
      "title": "",
      "summary": "",
      "strengths": [],
      "risks": []
    }
  ]
}

守護者PROPOSAL:
${proposals.map(p => p.raw).join("\n\n---\n\n")}

デミウルゴス批判:
${critique}
`;

  return prompt;
}


// ========================================
// 🧠 メイン：meetingHandler（1ターン実行）
// ========================================
async function meetingHandler(event) {

  try {

    const topic = event.text;

    // ⚠️ dispatcher側正規化済み想定だが保険
    const roomId = event.channelId || event.roomId || "";

    const taskId = event.task_id || null;

    console.log("================================");
    console.log("MEETING HANDLER START");
    console.log("TOPIC:", topic);
    console.log("ROOM:", roomId);
    console.log("TASK:", taskId);
    console.log("================================");

    // ====================================
    // 🧠 room_members取得（DB依存）
    // ====================================
    const membersResult = await db.query(
      `SELECT persona_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    // ====================================
    // 守護者抽出（デミ・アルベド除外）
    // ====================================
    const guardians = membersResult.rows
      .map(r => r.persona_id)
      .filter(p => p !== "demiurge" && p !== "albedo");

    // ====================================
    // ⚠️ 重要設計変更
    // ====================================
    // 旧：全員分を一気に実行（バグ原因）
    // 新：1ターンだけ実行（1人格のみ返す）
    // ====================================

    const currentTurn = event.turn_no || 0;

    const targetPersona = guardians[currentTurn % guardians.length];

    // ====================================
    // 1人だけ生成（ここが核心修正）
    // ====================================
    const proposal = await generateProposal(targetPersona, topic);

    await writeLog({
      task_id: taskId,
      room_id: roomId,
      persona_id: targetPersona,
      source: "meeting",
      speaker: "ai",
      message: proposal.raw,
      tags: ["proposal", "generate", "turn"]
    });

    // ====================================
    // ターン進行ログ
    // ====================================
    return {
      task_id: taskId,
      room_id: roomId,
      topic,
      currentTurn,
      nextTurn: currentTurn + 1,
      activePersona: targetPersona,
      proposal
    };

  } catch (err) {

    console.error("MEETING ERROR:", err);

    return {
      error: true,
      message: "meetingHandler failed"
    };
  }
}

module.exports = meetingHandler;
