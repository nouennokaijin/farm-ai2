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

const { webGate } =
  require("../utils/webGate");

const { createClient } = require("@supabase/supabase-js");

// ======================================
// 🔧 Supabase固定設定（Render環境依存を排除）
// ======================================

const SUPABASE_URL =
  "https://wtipmrssyutdyuuhokcn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_cWZyPK5GVOZKODDP9ozINQ_vdxZWxoc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
// Memory（🔥 修正ポイント）
// session単位で状態を分離する
// ========================================
const sessions = new Map();

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

    // ========================================
    // 🔥 修正ポイント：session分離
    // event単位ではなく room / channel / sessionで分離
    // ========================================
    const sessionId =
      event.session_id ||
      event.channelId ||
      "default";

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        histories: {},
        summaries: {},
        summarizingLock: {},
        loadedMemory: {}
      });
    }

    const session = sessions.get(sessionId);

    session.histories[personaId] ??= [];
    session.summaries[personaId] ??= [];

    const history = session.histories[personaId];
    const summary = session.summaries[personaId];

    // ====================================
    // Notion初回ロード
    // ====================================
    if (!session.loadedMemory[personaId]) {

      const notionMemory =
        await loadNotionMemory(text);

      if (notionMemory.length > 0) {
        summary.push(...notionMemory);
      }

      session.loadedMemory[personaId] = true;
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
    // WEB GATE
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
      !session.summarizingLock[personaId]
    ) {

      session.summarizingLock[personaId] = true;

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
        session.summarizingLock[personaId] = false;
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

    // ========================================
    // Supabase log
    // ========================================
    try {

      await supabase.from("conversation_logs").insert([
        {
          room_id: "albedo_room",
          persona_id: personaId,
          source: "chatHandler",
          speaker: "user",
          message: normalizedText
        }
      ]);

      const { error } = await supabase
        .from("conversation_logs")
        .insert([
          {
            room_id: "albedo_room",
            persona_id: personaId,
            source: "chatHandler",
            speaker: "ai",
            message: responseRaw
          }
        ]);

      if (error) {
        console.error("❌ Supabase insert error:", error);
      } else {
        console.log("✅ conversation_logs saved");
      }

    } catch (err) {
      console.error("❌ Supabase crash:", err);
    }

    await safeReply(event, responseRaw);

  } catch (err) {
    console.error("[ERROR] chatHandler", err);
  }
}

// ========================================
// 以下変更なし
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
