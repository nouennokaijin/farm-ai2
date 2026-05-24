// ========================================
// FILE: src/functions/handlers/meetingHandler.js
// PURPOSE: AI会議処理
// DATE: 2026/05/20
// AUTHOR: OKIURA KAZUO
// ========================================

// ========================================
// AI人格読み込み
// ========================================
// personas フォルダから
// albedo.js と demiurge.js を直接読み込む
// ========================================

const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");

// ========================================
// Groqサービス読み込み
// ========================================

const groq = require("../services/groqService");

// ========================================
// meetingHandler
// AI同士の討論処理
// ========================================

async function meetingHandler(event) {

  // ========================================
  // ユーザー入力取得
  // ========================================

  const topic = event.text;

  // ========================================
  // アルベド応答生成
  // ========================================

  const albedoReply = await groq.chat({

    // アルベド人格
    system: albedo.chatPersona,

    // 議題
    user: topic
  });

  // ========================================
  // デミウルゴス応答生成
  // ========================================
  // アルベドの発言を渡して
  // それに対する意見を返させる
  // ========================================

  const demiurgeReply = await groq.chat({

    // デミ人格
    system: demiurge.chatPersona,

    // アルベドの発言を入力
    user: albedoReply
  });

  // ========================================
  // 最終返信生成
  // ========================================

  const finalReply = `
【アルベド】
${albedoReply}

【デミウルゴス】
${demiurgeReply}
`;

  // ========================================
  // dispatcherへ返却
  // ========================================

  return {

    mode: "meeting",

    reply: finalReply
  };
}

// ========================================
// export
// ========================================

module.exports = meetingHandler;
