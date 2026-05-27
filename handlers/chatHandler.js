// ========================================
// PROJECT : farm-ai2
// FILE    : chatHandler.js (refactored)
// PURPOSE :
//   - rule-driven persona engine
//   - chat / group / meeting mode support
//   - centralized instruction system
//   - kei様 normalization enforced
// ========================================

const fs = require("fs");
const path = require("path");

const groqService = require("../services/groqService");

const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");
const shalltear = require("../personas/shalltear");

// ========================================
// Load Rules (EXTERNALIZED)
// ========================================
const rules = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/chatRule.json"),
    "utf-8"
  )
);

// ========================================
// Persona Map
// ========================================
const personaMap = {
  albedo,
  demiurge,
  shalltear,
  system: {
    name: "system",
    systemPrompt: ""
  }
};

// ========================================
// Memory
// ========================================
const histories = {};
const summaries = {};
const summarizingLock = {};

// ========================================
// Constants
// ========================================
const MAX_HISTORY = 12;
const MAX_SUMMARY = 6;
const TRIGGER_HISTORY_SIZE = 6;
const SUMMARY_SLICE_SIZE = 3;
const MAX_TOKENS = 80;

// ========================================
// Logger
// ========================================
const logger = {
  info: (...a) => console.log("[INFO]", ...a),
  debug: (...a) => console.debug("[DEBUG]", ...a),
  error: (...a) => console.error("[ERROR]", ...a),
};

// ========================================
// MAIN HANDLER
// ========================================
async function chatHandler(event) {
  try {

    const text = extractText(event);
    if (!text) return;

    const personaId = event.personaId || "system";
    const mode = event.mode || "chat";

    const persona = personaMap[personaId];

    logger.info("CHAT IN", { personaId, mode });

    // ====================================
    // Init memory
    // ====================================
    histories[personaId] ??= [];
    summaries[personaId] ??= [];

    const history = histories[personaId];
    const summary = summaries[personaId];

    // ====================================
    // Apply name normalization
    // ====================================
    const normalizedText = applyNameRules(text);

    push(history, { role: "user", content: normalizedText });

    // ====================================
    // Summarization trigger
    // ====================================
    if (
      history.length > TRIGGER_HISTORY_SIZE &&
      !summarizingLock[personaId]
    ) {
      summarizingLock[personaId] = true;

      const old = history.splice(0, SUMMARY_SLICE_SIZE);

      try {
        const s = await summarize(old, personaId);
        summary.push(s);

        if (summary.length > MAX_SUMMARY) summary.shift();

      } finally {
        summarizingLock[personaId] = false;
      }
    }

    // ====================================
    // Build prompts
    // ====================================
    const systemPrompt = buildSystemPrompt(persona, summary, mode);
    const recent = history.slice(-5);
    const userPrompt = buildUserPrompt(summary, recent, normalizedText);

    // ====================================
    // LLM CALL
    // ====================================
    const responseRaw = await groqService.chat({
      system: systemPrompt,
      user: userPrompt,
      max_tokens: MAX_TOKENS,
    });

    const response = sanitize(responseRaw);

    push(history, { role: "assistant", content: response });

    await safeReply(event, response);

  } catch (err) {
    logger.error("chatHandler error", err);
  }
}

// ========================================
// Name normalization (CENTRAL RULE)
// ========================================
function applyNameRules(text) {
  const map = rules.name_rules;

  let result = text;

  for (const [k, v] of Object.entries(map)) {
    result = result.replaceAll(k, v);
  }

  return result;
}

// ========================================
// System Prompt Builder (RULE DRIVEN)
// ========================================
function buildSystemPrompt(persona, summary, mode) {
  const modeRule = rules.modes[mode] || rules.modes.chat;
  const instruction = rules.instruction;

  return `
# PERSONA
${persona?.name || "system"}

# CORE
${persona?.systemPrompt || ""}

# MODE
${JSON.stringify(modeRule)}

# MEMORY SUMMARY
${summary.join("\n")}

# INSTRUCTION
max_chars=${instruction.max_length_chars}
final_only=${instruction.response_type}
single_sentence=${instruction.single_sentence}
prohibited=${instruction.prohibited_outputs.join(",")}
`.trim();
}

// ========================================
// User Prompt
// ========================================
function buildUserPrompt(summary, recent, text) {
  return `
# MEMORY SUMMARY
${summary.join("\n")}

# RECENT
${format(recent)}

# USER
${text}
`.trim();
}

// ========================================
// Summarizer
// ========================================
async function summarize(messages, personaId) {
  const text = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");

  const result = await groqService.chat({
    system: "会話を3〜5行で要約せよ。事実のみ。",
    user: `[${personaId}] ${text}`,
    max_tokens: 80,
  });

  return `[${personaId}] ${sanitize(result)}`;
}

// ========================================
// Reply
// ========================================
async function safeReply(event, text) {
  const clean = sanitize(text);
  if (!clean) return;

  try {
    if (event.reply) return await event.reply(clean);
    if (event.channel?.send) return await event.channel.send(clean);
  } catch (e) {
    logger.error("reply failed", e);
  }
}

// ========================================
// Sanitize
// ========================================
function sanitize(text) {
  if (typeof text !== "string") return "";

  return text
    .replace(/\[user\].*?\n/g, "")
    .replace(/\[assistant\].*?\n/g, "")
    .replace(/GROQ REQUEST START/g, "")
    .replace(/RAW RESPONSE:/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ========================================
// History utils
// ========================================
function push(arr, msg) {
  arr.push({ ...msg, timestamp: Date.now() });

  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }
}

function format(list) {
  return list.map(m => `[${m.role}] ${m.content}`).join("\n");
}

// ========================================
// Export
// ========================================
module.exports = chatHandler;
