// ========================================
// 📁 FOLDER : handlers
// 📄 FILE : chatHandler.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// chatHandler（会話生成エンジン / 人格思考レイヤー）
//
// ・ユーザー入力の正規化
// ・人格ごとの会話生成
// ・Web検索判断（webGate）
// ・短期記憶（history）
// ・中期記憶（summary）
// ・Notion長期記憶ロード & 要約保存
//
// ⚠️ NOTE
// このモジュールは「思考専用」
// ログ保存責務は dispatcher に委譲
// ========================================

const fs = require("fs"); // ファイル読み込み用（設定・ルール取得）
const path = require("path"); // パス解決ユーティリティ
const groqService = require("../services/groqService"); // LLM呼び出しサービス
const { saveMsgToNotion } = require("../utils/saveMsgToNotion"); // Notion保存（長期記憶）
const { buildTags } = require("../utils/tagger"); // タグ生成ユーティリティ
const { webGate } = require("../utils/webGate"); // 検索判断レイヤー

const albedo = require("../personas/albedo"); // 人格：アルベド
const demiurge = require("../personas/demiurge"); // 人格：デミウルゴス
const shalltear = require("../personas/shalltear"); // 人格：シャルティア

const rules = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/chatRule.json"), // チャットルール設定読み込み
    "utf-8"
  )
);

// ========================================
// Persona Map（人格辞書）
// ========================================
const personaMap = {
  albedo, // アルベド人格
  demiurge, // デミウルゴス人格
  shalltear, // シャルティア人格
  system: { name: "system", systemPrompt: "" } // システム人格（デフォルト）
};

// ========================================
// Memory System（短期・中期記憶）
// ========================================
const histories = {}; // 会話履歴（短期記憶）
const summaries = {}; // 要約記憶（中期記憶）
const summarizingLock = {}; // 要約処理の排他制御
const loadedMemory = {}; // Notionロード済みフラグ

const MAX_HISTORY = 12; // 履歴最大保持数
const MAX_SUMMARY = 6; // 要約保持数上限
const TRIGGER_HISTORY_SIZE = 6; // 要約トリガー閾値
const SUMMARY_SLICE_SIZE = 3; // 要約対象スライス数
const MAX_TOKENS = 120; // LLM最大トークン数

// ========================================
// MAIN（会話生成コア）
// ========================================
async function chatHandler(event) {
  try {

    const text = extractText(event); // 入力テキスト抽出
    if (!text) return null; // 空入力は終了

    const personaId = event.personaId || "system"; // 人格ID取得
    const mode = event.mode || "chat"; // モード取得
    const persona = personaMap[personaId]; // 人格参照

    histories[personaId] ??= []; // 履歴初期化
    summaries[personaId] ??= []; // 要約初期化

    const history = histories[personaId]; // 履歴参照
    const summary = summaries[personaId]; // 要約参照

    // ====================================
    // Notion初回ロード（長期記憶）
    // ====================================
    if (!loadedMemory[personaId]) {

      const notionMemory = await loadNotionMemory(text); // Notion取得

      if (notionMemory.length > 0) {
        summary.push(...notionMemory); // 要約へ統合
      }

      loadedMemory[personaId] = true; // ロード済みフラグ
    }

    const normalizedText = applyNameRules(text, rules); // 名前ルール適用

    push(history, { role: "user", content: normalizedText }); // 履歴にユーザー追加

    // ====================================
    // webGate（検索判断）
    // ====================================
    const webContext = await webGate(normalizedText, {
      history,
      summary
    });

    const webResult = formatWebResult(webContext); // 検索結果整形

    // ====================================
    // 要約処理（中期記憶生成）
    // ====================================
    if (
      history.length > TRIGGER_HISTORY_SIZE &&
      !summarizingLock[personaId]
    ) {

      summarizingLock[personaId] = true; // ロック開始

      const old = history.splice(0, SUMMARY_SLICE_SIZE); // 古い履歴を切り出し

      try {

        const s = await summarize(old, personaId); // 要約生成
        summary.push(s); // 要約保存

        const tags = await buildTags({ // タグ生成
          text: s,
          type: "チャット"
        });

        await saveMsgToNotion({ // Notion保存
          title: `${personaId} memory`,
          content: s,
          userText: s,
          tags
        });

        if (summary.length > MAX_SUMMARY) {
          summary.shift(); // 古い要約削除
        }

      } finally {
        summarizingLock[personaId] = false; // ロック解除
      }
    }

    // ====================================
    // Prompt構築
    // ====================================
    const systemPrompt = buildSystemPrompt(persona, summary, mode); // システムプロンプト生成
    const recent = history.slice(-5); // 直近履歴取得

    const userPrompt = buildUserPrompt({
      summary,
      recent,
      text: normalizedText,
      webResult
    }); // ユーザープロンプト生成

    // ====================================
    // AI呼び出し
    // ====================================
    const responseRaw = await groqService.chat({
      system: systemPrompt,
      user: userPrompt,
      max_tokens: MAX_TOKENS
    });

    push(history, {
      role: "assistant",
      content: responseRaw // AI応答を履歴に追加
    });

    // ⚠️ ログはここでは書かない（dispatcher責務）

    return responseRaw; // 応答返却

  } catch (err) {
    console.error("[ERROR] chatHandler", err); // エラー出力
    return null; // フォールバック
  }
}

// ========================================
// 🔧 Utility Functions
// ========================================

function extractText(event) { // 入力抽出
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

function applyNameRules(text, rules) { // 名前ルール適用
  const g = rules.global_rules || {};
  const nameRules = rules.name_rules || {};
  const honorific = g.honorific || { default: "" };

  const normalized = nameRules[text] || text;

  if (g.auto_append_honorific) {
    return normalized + honorific.default;
  }

  return normalized;
}

function buildSystemPrompt(persona, summary, mode) { // システムプロンプト生成
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

function buildUserPrompt({ summary, recent, text, webResult }) { // ユーザープロンプト生成
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

async function summarize(messages, personaId) { // 要約生成
  const text = messages.map(m => `[${m.role}] ${m.content}`).join("\n");

  const result = await groqService.chat({
    system: "会話を3〜5行で要約。事実のみ。",
    user: `[${personaId}] ${text}`,
    max_tokens: 80
  });

  return `[${personaId}] ${result}`;
}

async function loadNotionMemory(query) { // Notion長期記憶ロード
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

function push(arr, msg) { // 履歴追加（上限管理付き）
  arr.push({ ...msg, timestamp: Date.now() });

  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }
}

function format(list) { // 履歴フォーマット
  return list
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");
}

module.exports = chatHandler; // モジュール公開
