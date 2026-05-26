// ========================================
// PROJECT : farm-ai2
// FILE    : farm-ai2/handlers/chatHandler.js
// AUTHOR  : OKIURA KAZUO
// DATE    : 2026-05-27
// PURPOSE :
//   - personaごとの個別履歴管理
//   - 履歴の自動要約レイヤー
//   - トークン爆発防止
//   - ログと出力の完全分離
//   - 長期運用向け安定化改善版
// ========================================

const groqService = require("../services/groqService");

const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");
const shalltear = require("../personas/shalltear");

// ========================================
// Persona Mapping
// ========================================
const personaMap = {
  albedo,
  demiurge,
  shalltear,
};

// ========================================
// Tuning Parameters
// ========================================
const MAX_TOKENS = 80;
const MAX_HISTORY = 12;
const MAX_SUMMARY = 6;
const TRIGGER_HISTORY_SIZE = 6;
const SUMMARY_SLICE_SIZE = 3;

// ========================================
// Logger
// NOTE:
//   生テキストをログへ出力しない。
//   privacy保護のため内容保存禁止。
// ========================================
const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  debug: (...args) => console.debug("[DEBUG]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
};

// ========================================
// Runtime Memory
// NOTE:
//   RAM上のみ保持。
//   再起動時に消滅。
// ========================================
const histories = {};
const summaries = {};

// ========================================
// Summarize Lock
// NOTE:
//   summarize多重実行防止。
// ========================================
const summarizingLock = {};

// ========================================
// Main Chat Handler
// ========================================
async function chatHandler(event) {
  try {

    // ====================================
    // Extract Input
    // ====================================
    const text = extractText(event);

    if (!text) return;

    const personaId = event.personaId || "system";

    const persona =
      personaMap[personaId] ||
      personaMap.system || {
        name: "system",
        systemPrompt: "",
      };

    // ====================================
    // SAFE LOGGING
    // NOTE:
    //   textはログ出力しない
    // ====================================
    logger.info("CHAT IN", {
      personaId,
    });

    // ====================================
    // Initialize Memory
    // ====================================
    if (!histories[personaId]) {
      histories[personaId] = [];
    }

    if (!summaries[personaId]) {
      summaries[personaId] = [];
    }

    const history = histories[personaId];
    const summary = summaries[personaId];

    // ====================================
    // Save User Message
    // ====================================
    push(history, {
      role: "user",
      content: text,
    });

    // ====================================
    // Summarize Trigger
    // ====================================
    if (
      history.length > TRIGGER_HISTORY_SIZE &&
      !summarizingLock[personaId]
    ) {

      summarizingLock[personaId] = true;

      const oldMessages =
        history.splice(0, SUMMARY_SLICE_SIZE);

      logger.debug("SUMMARIZE TRIGGER", {
        personaId,
      });

      try {

        const summaryText =
          await summarize(oldMessages, personaId);

        summary.push(summaryText);

        // ==================================
        // Summary Overflow Protection
        // ==================================
        if (summary.length > MAX_SUMMARY) {
          summary.shift();
        }

      } finally {

        summarizingLock[personaId] = false;
      }
    }

    // ====================================
    // Build Prompts
    // ====================================
    const systemPrompt =
      buildSystemPrompt(persona, summary);

    const recent = history.slice(-5);

    const userPrompt =
      buildUserPrompt(summary, recent, text);

    // ====================================
    // LLM CALL
    // ====================================
    logger.info("GROQ CALL START");

    const responseRaw =
      await groqService.chat({
        system: systemPrompt,
        user: userPrompt,
        max_tokens: MAX_TOKENS,
      });

    logger.info("GROQ CALL DONE");

    // ====================================
    // Output Sanitize
    // ====================================
    const response = sanitize(responseRaw);

    // ====================================
    // Save Assistant Message
    // ====================================
    push(history, {
      role: "assistant",
      content: response,
    });

    // ====================================
    // Reply
    // ====================================
    await safeReply(event, response);

  } catch (err) {

    logger.error("[chatHandler ERROR]", err);
  }
}

// ========================================
// Extract Text Safely
// ========================================
function extractText(event) {

  return (
    event.text?.trim() ||
    event.content?.trim() ||
    event.message?.content?.trim() ||
    ""
  );
}

// ========================================
// Safe Reply
// ========================================
async function safeReply(event, text) {

  const clean = sanitize(text);

  if (!clean) return;

  try {

    if (event.reply) {
      return await event.reply(clean);
    }

    if (event.channel?.send) {
      return await event.channel.send(clean);
    }

  } catch (e) {

    logger.error("safeReply failed", e);
  }
}

// ========================================
// Sanitize Output
// NOTE:
//   LLMノイズ除去
// ========================================
function sanitize(text) {

  if (typeof text !== "string") {
    return "";
  }

  return text

    // ====================================
    // LLM Internal Noise
    // ====================================
    .replace(/assistant<\|header_end\|>/g, "")
    .replace(/\[user\].*?\n/g, "")
    .replace(/\[assistant\].*?\n/g, "")

    // ====================================
    // Internal Logs
    // ====================================
    .replace(/GROQ REQUEST START/g, "")
    .replace(/RAW RESPONSE:/g, "")
    .replace(/DISPATCHER START/g, "")
    .replace(/HEARTBEAT OK/g, "")

    // ====================================
    // Whitespace Cleanup
    // ====================================
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ========================================
// Summarize Old Messages
// ========================================
async function summarize(messages, personaId) {

  const text = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");

  const result =
    await groqService.chat({

      system: `
あなたは会話ログ圧縮器。
人格・装飾は禁止。
事実のみ抽出。
`,

      user: `
[${personaId}] の会話を3〜5行で要約してください。

${text}
`,

      max_tokens: 80,
    });

  return `[${personaId}] ${sanitize(result)}`;
}

// ========================================
// Push History
// NOTE:
//   overflow防止付き
// ========================================
function push(arr, msg) {

  arr.push({
    ...msg,
    timestamp: Date.now(),
  });

  if (arr.length > MAX_HISTORY) {

    arr.splice(
      0,
      arr.length - MAX_HISTORY
    );
  }
}

// ========================================
// Build User Prompt
// ========================================
function buildUserPrompt(summary, recent, text) {

  return `
# MEMORY SUMMARY
${summary.join("\n")}

# RECENT HISTORY
${format(recent)}

# USER MESSAGE
${text}
`.trim();
}

// ========================================
// Build System Prompt
// ========================================
function buildSystemPrompt(persona, summary) {

  return `
# PERSONA
${persona?.name || "system"}

# CORE
${persona?.systemPrompt || ""}

# MEMORY SUMMARY
${summary.join("\n")}

# INSTRUCTION
人格として30文字程度で簡潔に応答せよ。
出力は最終文のみ
それ以外の出力を禁止する。
補足・説明・修正案・注釈は禁止。
`.trim();
}

// ========================================
// Format History
// ========================================
function format(list) {

  return list
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");
}

// ========================================
// EXPORT
// ========================================
module.exports = chatHandler;
