// ========================================
// FILE: meetingHandler.js
// PATH: handlers/meetingHandler.js
// DATE: 2026-06-20
// AUTHOR: OKIURA KAZUO
// ========================================
//
// SUMMARY:
// 円卓会議エンジン（改良版）
// - room_membersを動的参照
// - PROPOSALを構造化JSON化
// - デミウルゴス/アルベド処理の安定化
//
// DESIGN PHILOSOPHY:
// AIは生成・破壊・再構築のみを担当し、決定は行わない
// ========================================

const { writeLog } = require("../core/logWriter");
const AIService = require("../services/AIService");
const db = require("../core/db"); // ★追加：room_members取得用


// ========================================
// PROPOSAL生成（守護者）
// ========================================
async function generateProposal(personaId, topic) {
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

  const result = await AIService.generate({
    personaId,
    prompt
  });

  return {
    personaId,
    raw: result
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

  const result = await AIService.generate({
    personaId: "demiurge",
    prompt
  });

  return result;
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

  const result = await AIService.generate({
    personaId: "albedo",
    prompt
  });

  return result;
}


// ========================================
// メイン：meetingHandler
// ========================================
async function meetingHandler(event) {
  try {
    const topic = event.text;
    const roomId = event.channelId;
    const taskId = event.task_id || null;

    console.log("================================");
    console.log("MEETING HANDLER START");
    console.log("TOPIC:", topic);
    console.log("ROOM:", roomId);
    console.log("TASK:", taskId);
    console.log("================================");

    // ====================================
    // ★変更① room_membersから動的取得
    // ====================================
    const membersResult = await db.query(
      `SELECT persona_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    const guardians = membersResult.rows
      .map(r => r.persona_id)
      .filter(p => p !== "demiurge" && p !== "albedo");

    // ====================================
    // 1. 守護者（生成フェーズ）
    // ====================================
    const proposals = [];

    for (const g of guardians) {
      const proposal = await generateProposal(g, topic);

      proposals.push(proposal);

      await writeLog({
        task_id: taskId,
        room_id: roomId,
        persona_id: g,
        source: "meeting",
        speaker: "ai",
        message: proposal.raw,
        tags: ["proposal", "generate"]
      });
    }

    // ====================================
    // 2. デミウルゴス（破壊フェーズ）
    // ====================================
    const critique = await critiqueProposals(proposals, topic);

    await writeLog({
      task_id: taskId,
      room_id: roomId,
      persona_id: "demiurge",
      source: "meeting",
      speaker: "ai",
      message: critique,
      tags: ["critique", "destroy"]
    });

    // ====================================
    // 3. アルベド（再構築フェーズ）
    // ====================================
    const finalProposal = await rebuildProposal(
      topic,
      proposals,
      critique
    );

    await writeLog({
      task_id: taskId,
      room_id: roomId,
      persona_id: "albedo",
      source: "meeting",
      speaker: "ai",
      message: finalProposal,
      tags: ["proposal", "final"]
    });

    // ====================================
    // 4. 結果返却
    // ====================================
    return {
      task_id: taskId,
      room_id: roomId,
      topic,
      guardians,
      proposals,
      critique,
      finalProposal
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
