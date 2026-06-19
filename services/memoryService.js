// ========================================
// 📁 FOLDER : services
// 📄 FILE : memoryService.js（補完完成版）
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// memoryService（会話パイプライン統合）
//
// ・SessionUnit管理
// ・WebGate実行
// ・SummarizerUnit実行
// ・MemoryUnit構築
// ・LLM呼び出し
// ・LogUnit実行
//
// ========================================

const { webGate } = require("../utils/webGate");

// Units
const SessionUnit = require("../units/SessionUnit");
const LogUnit = require("../units/LogUnit");
const SummarizerUnit = require("../units/SummarizerUnit");
const MemoryUnit = require("../units/MemoryUnit");
const LLMClient = require("../units/llmClient");

// Personas / Rules
const fs = require("fs");
const path = require("path");

//const albedo = require("../personas/albedo");
//const demiurge = require("../personas/demiurge");
//const shalltear = require("../personas/shalltear");


// ========================================
// Persona Auto Loader
// 2026-06-20
//
// personasフォルダ内の .js を自動読込
//
// 例:
// personas/albedo.js   → personaId = "albedo"
// personas/aura.js     → personaId = "aura"
// personas/mare.js     → personaId = "mare"
//
// 新人格追加時は
// personasフォルダへ配置するだけ。
// memoryService.js の修正不要。
// ========================================

const personaMap = {
  system: {
    name: "system",
    systemPrompt: ""
  }
};

const personaDir = path.join(
  __dirname,
  "../personas"
);

fs.readdirSync(personaDir)
  .filter(file => file.endsWith(".js"))
  .forEach(file => {

    const personaId =
      path.basename(file, ".js");

    personaMap[personaId] = require(
      path.join(personaDir, file)
    );

    console.log(
      `✅ Persona Loaded: ${personaId}`
    );

  });


const rules = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/chatRule.json"),
    "utf-8"
  )
);

const personaMap = {
  albedo,
  demiurge,
  shalltear,
  system: { name: "system", systemPrompt: "" }
};

// ========================================
// MAIN
// ========================================
async function run({
  text,
  personaId,
  mode,
  sessionId,
  event
}) {
  const persona = personaMap[personaId] || personaMap.system;

  // ====================================
  // Session
  // ====================================
  const session = SessionUnit.get(sessionId, personaId);

  // ====================================
  // Normalize
  // ====================================
  const normalizedText = applyNameRules(text);

  SessionUnit.push(session, personaId, {
    role: "user",
    content: normalizedText
  });

  // ====================================
  // WebGate
  // ====================================
  const webContext = await webGate(normalizedText, {
    history: session.histories[personaId],
    summary: session.summaries[personaId]
  });

  // ====================================
  // Summarizer
  // ====================================
  await SummarizerUnit.tick(session, personaId);

  // ====================================
  // Memory build
  // ====================================
  const memory = MemoryUnit.build(session, personaId);
  const recent = SessionUnit.recent(session, personaId, 5);

  // ====================================
  // Prompt
  // ====================================
  const systemPrompt = buildSystemPrompt(persona, memory.summary, mode);

  const userPrompt = buildUserPrompt({
    summary: memory.summary,
    recent,
    text: normalizedText,
    webResult: formatWebResult(webContext)
  });

  // ====================================
  // LLM
  // ====================================
  const responseRaw = await LLMClient.chat({
    system: systemPrompt,
    user: userPrompt,
    max_tokens: 120
  });

  // ====================================
  // Save history
  // ====================================
  SessionUnit.push(session, personaId, {
    role: "assistant",
    content: responseRaw
  });

  // ====================================
  // LOG DISABLED
  // 2026-06-14
  // 二重ログ防止のため無効化
  //
  // 現在の会話ログ保存は
  // dispatcher → writeLog()
  // が唯一の保存経路とする。
  //
  // memoryServiceは
  // 「会話生成専用」
  // に責務を限定する。
  // ====================================

  /*
  await LogUnit.write({
    sessionId,
    personaId,
    user: normalizedText,
    assistant: responseRaw
  });
  */

  return responseRaw;
}

// ========================================
// helpers
// ========================================

function applyNameRules(text) {
  return text;
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
${recent.map(m => `[${m.role}] ${m.content}`).join("\n")}

# WEB
${webResult || "none"}

# USER
${text}
`.trim();
}

function formatWebResult(webContext) {
  if (!webContext) return "none";

  return `
# WEB SEARCH
searched: ${webContext.searched}
score: ${webContext.score}
reason: ${webContext.reason}

${webContext.data?.results
  ? webContext.data.results
      .map(r => `🔹 ${r.title}\n${r.snippet}\n${r.url}`)
      .join("\n\n")
  : "no results"}
`.trim();
}

module.exports = { run };
