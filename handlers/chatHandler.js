// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : chatHandler.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// chatHandler（人格 + 会話エンジン）
//
// ・会話生成
// ・Notion長期記憶
// ・webGateによる検索制御（重要）
// ・searchAdapterには直接触れない
//
// 🎯 設計思想
// chatHandlerは“考えるだけ”
// 外部検索判断はすべてwebGateに委譲
//
// ========================================

const fs = require("fs");
const path = require("path");

const groqService = require("../services/groqService");

const { saveMsgToNotion } =
  require("../utils/saveMsgToNotion");

const { buildTags } =
  require("../utils/tagger");

// 🚪 重要：webGateのみ接続（searchAdapterは見ない）
const { webGate } =
  require("../utils/webGate");

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
// Memory
// ========================================
const histories = {};
const summaries = {};
const summarizingLock = {};
const loadedMemory = {};

// ========================================
// Constants
// ========================================
const MAX_HISTORY = 12;
const MAX_SUMMARY = 6;
const TRIGGER_HISTORY_SIZE = 6;
const SUMMARY_SLICE_SIZE = 3;
const MAX_TOKENS = 120;


// ========================================
// MAIN
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
    // Notion初回ロード
    // ====================================
    if (!loadedMemory[personaId]) {

      const notionMemory =
        await loadNotionMemory(text);

      if (notionMemory.length > 0) {
        summary.push(...notionMemory);
      }

      loadedMemory[personaId] = true;
    }

    // ====================================
    // 入力処理
    // ====================================
    const normalizedText =
      applyNameRules(text, rules);

    push(history, {
      role: "user",
      content: normalizedText
    });

    // ====================================
    // 🚪 WEB GATE（ここが唯一の検索判断点）
    // ====================================

    const webContext = await webGate(normalizedText, {
      history,
      summary
    });

    const webResult =
      formatWebResult(webContext);

    // ====================================
    // 要約処理
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

        const tags = await buildTags({
          text: s,
          type: "チャット"
        });

        await saveMsgToNotion({
          title: `${personaId} memory`,
          content: s,
          userText: s,
          tags
        });

        if (summary.length > MAX_SUMMARY) {
          summary.shift();
        }

      } finally {
        summarizingLock[personaId] = false;
      }
    }

    // ====================================
    // Prompt
    // ====================================
    const systemPrompt =
      buildSystemPrompt(persona, summary, mode);

    const recent = history.slice(-5);

    const userPrompt = buildUserPrompt({
      summary,
      recent,
      text: normalizedText,
      webResult
    });

    // ====================================
    // AI
    // ====================================
    const responseRaw =
      await groqService.chat({
        system: systemPrompt,
        user: userPrompt,
        max_tokens: MAX_TOKENS
      });

    push(history, {
      role: "assistant",
      content: responseRaw
    });

    await safeReply(event, responseRaw);

  } catch (err) {
    console.error("[ERROR] chatHandler", err);
  }
}


// ========================================
// 🌐 webGate結果フォーマット
// ========================================

function formatWebResult(webContext) {

  if (!webContext) return "none";

  return `
# WEB SEARCH
searched: ${webContext.searched}
score: ${webContext.score}
reason: ${webContext.reason}

${webContext.data?.results
  ? webContext.data.results
      .map(r =>
        `🔹 ${r.title}\n${r.snippet}\n${r.url}`
      )
      .join("\n\n")
  : "no results"}
`.trim();
}


// ========================================
// 🔧 以下は元のまま
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

function applyNameRules(text, rules) {

  const g = rules.global_rules || {};
  const nameRules = rules.name_rules || {};
  const honorific = g.honorific || { default: "" };

  const normalized = nameRules[text] || text;

  if (g.auto_append_honorific) {
    return normalized + honorific.default;
  }

  return normalized;
}

function buildSystemPrompt(persona, summary, mode) {

  const modeRule = rules.modes?.[mode] || rules.modes.chat;

  return `
# PERSONA
${persona?.name || "system"}

# CORE
${persona?.systemPrompt || ""}

# MEMORY
${summary.join("\n")}

# RULES
max_chars=${modeRule.max_length_chars || 80}
`.trim();
}

function buildUserPrompt({
  summary,
  recent,
  text,
  webResult
}) {

  return `
# MEMORY
${summary.join("\n")}

# RECENT
${format(recent)}

# WEB
${webResult || "none"}

# USER
${text}
`.trim();
}

async function summarize(messages, personaId) {

  const text = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");

  const result = await groqService.chat({
    system: "会話を3〜5行で要約。事実のみ。",
    user: `[${personaId}] ${text}`,
    max_tokens: 80
  });

  return `[${personaId}] ${result}`;
}

async function loadNotionMemory(query) {

  try {

    const axios = require("axios");

    const res = await axios.post(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      { page_size: 5 },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        }
      }
    );

    return (res.data.results || [])
      .map(page =>
        page.properties?.AI?.rich_text?.[0]?.plain_text || ""
      )
      .filter(Boolean);

  } catch (err) {
    console.error("notion load error", err.message);
    return [];
  }
}

async function safeReply(event, text) {

  if (!text) return;

  if (event.reply) return await event.reply(text);
  if (event.channel?.send) return await event.channel.send(text);
}

function push(arr, msg) {

  arr.push({ ...msg, timestamp: Date.now() });

  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }
}

function format(list) {

  return list
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");
}

module.exports = chatHandler;
