// ========================================
// FILE: src/handlers/chatHandler.js
// DATE: 2026-05-24
// AUTHOR: OKIURA KAZUO
// PURPOSE:
//   - dispatcherから渡されたpersonaIdを受け取る
//   - personaデータを取得する
//   - 雑談ムードを付与する
//   - 会話履歴を共有管理する
//   - Groqへ渡して生成する
// NOTE:
//   全人格で会話履歴を共有する
// ========================================

// ========================================
// Groq Service（生成担当）
// ========================================
const groqService = require("../services/groqService");

// ========================================
// 人格データ群
// ========================================
const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");
const shalltear = require("../personas/shalltear");

// ========================================
// personaレジストリ
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
// 会話履歴
// 全人格共有
// ========================================
const history = [];

// ========================================
// 最大保存件数
// ========================================
const MAX_HISTORY = 15;

// ========================================
// DEFAULT PERSONA
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
    // personaId無し = user
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
    // messages生成
    // ====================================
    const messages = buildMessages({
      systemPrompt,
      history: recentHistory,
      userMessage: text,
    });

    // ====================================
    // ログ
    // ====================================
    console.log("================================");
    console.log("CHAT HANDLER START");
    console.log("PERSONA ID:", personaId);
    console.log("PERSONA:", persona.name);
    console.log("TEXT:", text);
    console.log("HISTORY:", recentHistory.length);
    console.log("================================");

    // ====================================
    // Groqへ渡す
    // ====================================
    const response =
      await groqService.chat({

        messages,

        max_tokens: MAX_TOKENS,
      });

    // ====================================
    // AI返答取得
    // ====================================
    const aiReply =
      typeof response === "string"
        ? response
        : response?.content || "・・・";

    // ====================================
    // AI返答保存
    // personaIdあり = AI
    // ====================================
    addHistory({
      personaId,
      content: aiReply,
    });

    // ====================================
    // 返信処理
    // ====================================
    if (event.reply) {

      await event.reply(aiReply);

    } else if (event.channel?.send) {

      await event.channel.send(aiReply);
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
    // 発言時間
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
// OpenAI/Groq messages生成
// ========================================
function buildMessages({
  systemPrompt,
  history,
  userMessage,
}) {

  // ====================================
  // 履歴整形
  // ====================================
  const formattedHistory =
    history.map((msg) => {

      // ------------------------------
      // AI発言
      // ------------------------------
      if (msg.personaId) {

        return {
          role: "assistant",
          content:
            `[${msg.personaId.toUpperCase()}] ${msg.content}`,
        };
      }

      // ------------------------------
      // user発言
      // ------------------------------
      return {
        role: "user",
        content: msg.content,
      };
    });

  // ====================================
  // messages生成
  // ====================================
  return [

    // ------------------------------
    // system
    // ------------------------------
    {
      role: "system",
      content: systemPrompt,
    },

    // ------------------------------
    // 履歴
    // ------------------------------
    ...formattedHistory,

    // ------------------------------
    // 最新入力
    // ------------------------------
    {
      role: "user",
      content: userMessage,
    },
  ];
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
- Name: ${persona.name}
- Tone: ${persona.personality?.tone}
- Emotion: ${persona.personality?.emotion}
- Style: ${persona.personality?.style}

# PERSONA CORE
${persona.systemPrompt}

# MOOD（雑談設定）
- Mode: ${mood.mode}
- Tone: ${mood.tone}
- Flow: ${mood.flow}

# RULES
${mood.rules.map(r => `- ${r}`).join("\n")}

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
