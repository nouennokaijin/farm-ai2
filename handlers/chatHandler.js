// ========================================
// PROJECT        : farm-ai2
// FILE           : handlers/chatHandler.js
// DATE           : 2026-05-28
// AUTHOR         : OKIURA KAZUO
// PURPOSE        :
//   - ルール適用＋人格チャットエンジン
//   - Notion長期記憶
//   - AI検索エージェント
// ========================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const groqService = require("../services/groqService");

const { saveMsgToNotion } =
  require("../utils/saveMsgToNotion");

const { buildTags } =
  require("../utils/tagger");

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

    const personaId =
      event.personaId || "system";

    const mode =
      event.mode || "chat";

    const persona =
      personaMap[personaId];

    histories[personaId] ??= [];
    summaries[personaId] ??= [];

    const history =
      histories[personaId];

    const summary =
      summaries[personaId];

    // ====================================
    // 初回のみNotion記憶ロード
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
    // 名前ルール
    // ====================================
    const normalizedText =
      applyNameRules(text, rules);

    push(history, {
      role: "user",
      content: normalizedText
    });

    // ====================================
    // AI検索判定
    // ====================================
    const webResult =
      await maybeWebSearch(normalizedText);

    // ====================================
    // 要約
    // ====================================
    if (
      history.length > TRIGGER_HISTORY_SIZE &&
      !summarizingLock[personaId]
    ) {

      summarizingLock[personaId] = true;

      const old =
        history.splice(0, SUMMARY_SLICE_SIZE);

      try {

        const s =
          await summarize(old, personaId);

        summary.push(s);

        // ================================
        // Notion保存
        // ================================
        const tags =
          await buildTags({
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
      buildSystemPrompt(
        persona,
        summary,
        mode
      );

    const recent =
      history.slice(-5);

    const userPrompt =
      buildUserPrompt({
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

    await safeReply(
      event,
      responseRaw
    );

  } catch (err) {

    console.error(
      "[ERROR] chatHandler",
      err
    );
  }
}

// ========================================
// AI Web Search Judge
// ========================================
async function maybeWebSearch(text) {

  try {

    const judge =
      await groqService.chat({
        system: `
検索が必要か YES / NO のみ返答。
最新情報・ニュース・価格・発売日
時事・Web情報なら YES。
`,
        user: text,
        max_tokens: 5
      });

    if (!judge.includes("YES")) {
      return "";
    }

    // ====================================
    // Tavily例
    // ====================================
    const res = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: process.env.TAVILY_API_KEY,
        query: text,
        max_results: 3
      }
    );

    const results =
      res.data.results || [];

    return results
      .map(r =>
        `${r.title}\n${r.content}`
      )
      .join("\n\n")
      .slice(0, 1200);

  } catch (err) {

    console.error(
      "web search error",
      err.message
    );

    return "";
  }
}

// ========================================
// Notion Memory Load
// ========================================
async function loadNotionMemory(query) {

  try {

    const res = await axios.post(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      {
        page_size: 5
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.NOTION_API_KEY}`,

          "Notion-Version":
            "2022-06-28",

          "Content-Type":
            "application/json"
        }
      }
    );

    const results =
      res.data.results || [];

    return results.map(page => {

      const txt =
        page.properties?.AI?.rich_text?.[0]
          ?.plain_text || "";

      return txt;

    }).filter(Boolean);

  } catch (err) {

    console.error(
      "notion load error",
      err.message
    );

    return [];
  }
}

// ========================================
// Name Rules
// ========================================
function applyNameRules(text, rules) {

  const g =
    rules.global_rules || {};

  const nameRules =
    rules.name_rules || {};

  const honorific =
    g.honorific || {
      default: ""
    };

  const normalized =
    nameRules[text] || text;

  if (g.auto_append_honorific) {

    return (
      normalized +
      honorific.default
    );
  }

  return normalized;
}

// ========================================
// Extract Text
// ========================================
function extractText(event) {

  if (!event) return "";

  if (typeof event === "string") {
    return event;
  }

  return (
    event.content ||
    event.text ||
    event.message?.content ||
    event.data?.content ||
    ""
  );
}

// ========================================
// System Prompt
// ========================================
function buildSystemPrompt(
  persona,
  summary,
  mode
) {

  const modeRule =
    rules.modes?.[mode] ||
    rules.modes.chat;

  const instruction =
    rules.global_rules || {};

  return `
# PERSONA
${persona?.name || "system"}

# CORE
${persona?.systemPrompt || ""}

# MEMORY
${summary.join("\n")}

# RULES
max_chars=${modeRule.max_length_chars || 80}
final_only=${instruction.response_type}
`.trim();
}

// ========================================
// User Prompt
// ========================================
function buildUserPrompt({
  summary,
  recent,
  text,
  webResult
}) {

  return `
# MEMORY SUMMARY
${summary.join("\n")}

# RECENT
${format(recent)}

# WEB
${webResult || "none"}

# USER
${text}
`.trim();
}

// ========================================
// Summarize
// ========================================
async function summarize(
  messages,
  personaId
) {

  const text = messages
    .map(m =>
      `[${m.role}] ${m.content}`
    )
    .join("\n");

  const result =
    await groqService.chat({
      system:
        "会話を3〜5行で要約。事実のみ。",
      user:
        `[${personaId}] ${text}`,
      max_tokens: 80
    });

  return `[${personaId}] ${result}`;
}

// ========================================
// Reply
// ========================================
async function safeReply(event, text) {

  if (!text) return;

  if (event.reply) {
    return await event.reply(text);
  }

  if (event.channel?.send) {
    return await event.channel.send(text);
  }
}

// ========================================
// History Push
// ========================================
function push(arr, msg) {

  arr.push({
    ...msg,
    timestamp: Date.now()
  });

  if (arr.length > MAX_HISTORY) {

    arr.splice(
      0,
      arr.length - MAX_HISTORY
    );
  }
}

// ========================================
// Format
// ========================================
function format(list) {

  return list
    .map(m =>
      `[${m.role}] ${m.content}`
    )
    .join("\n");
}

// ========================================
// Export
// ========================================
module.exports = chatHandler;
