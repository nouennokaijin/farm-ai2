// ========================================
// PROJECT        : farm-ai2
// FILE           : handlers/chatHandler.js
// PURPOSE        : ルール適用＋人格チャットエンジン
// ========================================

const fs = require("fs");
const path = require("path");

const groqService = require("../services/groqService");

// ========================================
// Personas
// ========================================
const albedo = require("../personas/albedo");
const demiurge = require("../personas/demiurge");
const shalltear = require("../personas/shalltear");

// ========================================
// Load Rules
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
  system: { name: "system", systemPrompt: "" }
};

// ========================================
// Memory Store
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
// MAIN HANDLER
// ========================================
async function chatHandler(event) {
  try {
    const text = extractText(event);
    if (!text) return;

    const personaId = event.personaId || "system";
    const mode = event.mode || "chat";
    const persona = personaMap[personaId];

    histories[personaId] ??= [];
    summaries[personaId] ??= [];

    const history = histories[personaId];
    const summary = summaries[personaId];

    // ====================================
    // USER NAME RULE APPLIER
    // ★ここが追加ポイント
    // ====================================
    const normalizedText = applyNameRules(text, rules);

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

        if (summary.length > MAX_SUMMARY) {
          summary.shift();
        }
      } finally {
        summarizingLock[personaId] = false;
      }
    }

    // ====================================
    // PROMPT BUILD
    // ====================================
    const systemPrompt = buildSystemPrompt(persona, summary, mode);
    const recent = history.slice(-5);

    const userPrompt = buildUserPrompt(summary, recent, normalizedText);

    const responseRaw = await groqService.chat({
      system: systemPrompt,
      user: userPrompt,
      max_tokens: MAX_TOKENS,
    });

    push(history, { role: "assistant", content: responseRaw });

    await safeReply(event, responseRaw);

  } catch (err) {
    console.error("[ERROR] chatHandler", err);
  }
}

// ========================================
// NAME + HONORIFIC RULE ENGINE
// ★ここで初めて global_rules を実行利用
// ========================================
function applyNameRules(text, rules) {
  const g = rules.global_rules || {};
  const nameRules = g.name_rules || {};
  const honorific = g.honorific || { default: "" };

  // 例：完全一致置換
  const normalized = nameRules[text] || text;

  // 敬称付与（フラグON時のみ）
  if (g.auto_append_honorific) {
    return normalized + honorific.default;
  }

  return normalized;
}

// ========================================
// Extract Text
// ========================================
function extractText(event) {
  if (!event) return "";

  if (typeof event === "string") return event;

  return (
    event.content ||
    event.text ||
    event.message?.content ||
    event.data?.content ||
    ""
  );
}

// ========================================
// SYSTEM PROMPT
// ========================================
function buildSystemPrompt(persona, summary, mode) {
  const modeRule = rules.modes?.[mode] || rules.modes.chat;
  const instruction = rules.global_rules || {};

  return `
# PERSONA
${persona?.name || "system"}

# CORE
${persona?.systemPrompt || ""}

# MODE
${JSON.stringify(modeRule)}

# MEMORY SUMMARY
${summary.join("\n")}

# RULES
max_chars=${modeRule.max_length_chars || 80}
final_only=${instruction.response_type}
single_sentence=${modeRule.single_sentence}
prohibited=${(instruction.prohibited_outputs || []).join(",")}
`.trim();
}

// ========================================
// USER PROMPT
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
// SUMMARIZER
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

  return `[${personaId}] ${result}`;
}

// ========================================
// SAFE REPLY
// ========================================
async function safeReply(event, text) {
  if (!text) return;

  if (event.reply) return await event.reply(text);
  if (event.channel?.send) return await event.channel.send(text);
}

// ========================================
// HISTORY
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

module.exports = chatHandler;
