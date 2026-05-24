// ========================================
// FILE: src/handlers/chatHandler.js
// DATE: 2026-05-23
// AUTHOR: OKIURA KAZUO
// PURPOSE:
//   - dispatcherから渡されたpersonaIdを受け取る
//   - personaデータを取得する
//   - 雑談ムードを付与する
//   - Groqへ渡して生成するだけ
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
    // ★ 使用人格ID（dispatcherから受け取る）
    // ====================================
    const personaId = event.personaId || "system";

    // ====================================
    // ★ 人格実体化（ここで初めてオブジェクトになる）
    // ====================================
    const persona = personaMap[personaId] || defaultPersona;

    // ====================================
    // ★ 雑談ムード（chatHandlerの責務）
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
    // systemPrompt生成（人格＋ムード統合）
    // ====================================
    const systemPrompt = buildSystemPrompt({
      persona,
      mood,
    });

    // ====================================
    // ログ
    // ====================================
    console.log("================================");
    console.log("CHAT HANDLER START");
    console.log("PERSONA ID:", personaId);
    console.log("PERSONA:", persona.name);
    console.log("MOOD:", mood.tone);
    console.log("TEXT:", text);
    console.log("================================");

    // ====================================
    // Groqへ渡す（生成のみ）
    // ====================================
    const response = await groqService.chat({
      system: systemPrompt,
      user: text,
      max_tokens: MAX_TOKENS,
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
    console.error("[chatHandler Fatal Error]", err);
  }
}

// ========================================
// SYSTEM PROMPT生成
// ========================================
function buildSystemPrompt({ persona, mood }) {
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

# INSTRUCTION
人格とムードを両方反映し、一貫した自然な会話を行うこと。
`;
}

module.exports = chatHandler;
