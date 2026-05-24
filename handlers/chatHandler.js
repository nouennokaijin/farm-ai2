// ========================================
// FILE: src/handlers/chatHandler.js
// DATE: 2026-05-24
// AUTHOR: OKIURA KAZUO
// PURPOSE:
//   - dispatcherから渡されたpersonaIdを受け取る
//   - personaデータを取得する
//   - 雑談ムードを付与する
//   - 全人格共有の会話履歴を持つ
//   - Groqへ渡して生成する
// NOTE:
//   ここでは「判断しない」＝人格決定もしない
// ========================================

// ========================================
// Groq Service（生成担当）
// ========================================
const groqService = require("../services/groqService");

// ========================================
// 人格データ群（追加していく場所）
// ========================================
const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");
const shalltear = require("../personas/shalltear");

// ========================================
// personaレジストリ（文字列→実体変換）
// ========================================
const personaMap = {
  albedo,
  demiurge,
  shalltear,
};

// ========================================
// MAX TOKENS（出力制御）
// ========================================
const MAX_TOKENS = 80;

// ========================================
// 会話履歴（全人格共有）
// ========================================
const history = [];

// ========================================
// 最大履歴保存数
// ========================================
const MAX_HISTORY = 15;

// ========================================
// DEFAULT PERSONA（安全装置）
// ========================================
const defaultPersona = {
  name: "system",
  systemPrompt: "あなたは自然で簡潔なAIです。",
  personality: {
    tone: "neutral",
    emotion: "stable",
    style: "basic",
  },
};

// ========================================
// CHAT HANDLER
// ========================================
async function chatHandler(event) {

  try {

    // ====================================
    // ユーザー入力取得
    // ====================================
    const text =
      event.text?.trim() ||
      event.content?.trim() ||
      event.message?.content?.trim() ||
      "";

    if (!text) return;

    // ====================================
    // 使用人格ID
    // ====================================
    const personaId =
      event.personaId || "system";

    // ====================================
    // 人格実体化
    // ====================================
    const persona =
      personaMap[personaId] ||
      defaultPersona;

    // ====================================
    // 雑談ムード
    // ====================================
    const mood = {
      mode: "chat",
      tone: "casual",
      flow: "natural",
      rules: [
        "短すぎず自然に返答する",
        "軽い感情を含める",
        "会話の流れを優先する",
      ],
    };

    // ====================================
    // ユーザー発言保存
    // personaIdなし = user
    // ====================================
    addHistory({
      content: text,
    });

    // ====================================
    // 最新履歴取得
    // ====================================
    const recentHistory =
      getRecentHistory(5);

    // ====================================
    // systemPrompt生成
    // ====================================
    const systemPrompt =
      buildSystemPrompt({
        persona,
        mood,
      });

    // ====================================
    // 履歴文字列生成
    // ====================================
    const historyText =
      buildHistoryText(recentHistory);

    // ====================================
    // user入力へ履歴統合
    // 元のgroqService受け渡し形式を維持
    // ====================================
    const userPrompt = `
# RECENT HISTORY
${historyText}

# USER MESSAGE
${text}
`;

    // ====================================
    // ログ
    // ====================================
    console.log("================================");
    console.log("CHAT HANDLER START");
    console.log("PERSONA ID:", personaId);
    console.log("PERSONA:", persona.name);
    console.log("MOOD:", mood.tone);
    console.log("TEXT:", text);
    console.log("HISTORY:", recentHistory.length);
    console.log("================================");

    // ====================================
    // Groqへ渡す
    // 元のsystem/user構造を維持
    // ====================================
    const response =
      await groqService.chat({

        system: systemPrompt,

        user: userPrompt,

        max_tokens: MAX_TOKENS,
      });

    // ====================================
    // AI返答保存
    // ====================================
    addHistory({
      personaId,
      content: response,
    });

    // ====================================
    // 返信処理
    // ====================================
    if (event.reply) {

      await event.reply(response);

    } else if (event.channel?.send) {

      await event.channel.send(response);
    }

  } catch (err) {

    console.error(
      "[chatHandler Fatal Error]",
      err
    );
  }
}

// ========================================
// 会話履歴追加
// ========================================
function addHistory({
  content,
  personaId = null,
}) {

  // 空防止
  if (!content) return;

  history.push({

    // ------------------------------
    // personaIdあり = AI
    // personaIdなし = user
    // ------------------------------
    personaId,

    // ------------------------------
    // 発言内容
    // ------------------------------
    content,

    // ------------------------------
    // 時間
    // ------------------------------
    timestamp: Date.now(),
  });

  // ====================================
  // 古い履歴削除
  // ====================================
  while (history.length > MAX_HISTORY) {

    history.shift();
  }
}

// ========================================
// 最新履歴取得
// ========================================
function getRecentHistory(limit = 5) {

  return history.slice(-limit);
}

// ========================================
// 履歴文字列生成
// ========================================
function buildHistoryText(historyData) {

  return historyData.map((msg) => {

    // --------------------------------
    // AI発言
    // --------------------------------
    if (msg.personaId) {

      return `[${msg.personaId.toUpperCase()}] ${msg.content}`;
    }

    // --------------------------------
    // USER発言
    // --------------------------------
    return `[USER] ${msg.content}`;

  }).join("\n");
}

// ========================================
// SYSTEM PROMPT生成
// ========================================
function buildSystemPrompt({
  persona,
  mood,
}) {

  return `
# PERSONA（使用人格）
- Name: ${persona?.name || "Unknown"}
- Tone: ${persona?.personality?.tone || "neutral"}
- Emotion: ${persona?.personality?.emotion || "stable"}
- Style: ${persona?.personality?.style || "basic"}

# PERSONA CORE
${persona?.systemPrompt || "自然に会話してください"}

# MOOD（雑談設定）
- Mode: ${mood?.mode || "chat"}
- Tone: ${mood?.tone || "casual"}
- Flow: ${mood?.flow || "natural"}

# RULES
${(mood?.rules || [])
  .map(r => `- ${r}`)
  .join("\n")}

# SHARED MEMORY
- 会話履歴は全人格で共有されています
- 他人格との会話も認識してください
- 誰が発言したか理解してください
- 自然な流れで会話してください

# INSTRUCTION
人格とムードを両方反映し、
自然で一貫した会話を行うこと。
`;
}

// ========================================
// EXPORT
// ========================================
module.exports = chatHandler;
