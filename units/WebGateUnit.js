// ========================================
// 📁 FILE: units/WebGateUnit.js
// 📂 FOLDER: units
// 📅 DATE: 2026-06-21
// 👤 AUTHOR: OKIURA KAZUO
// 🧠 SUMMARY:
//   WebGateUnit（検索判断＋暴走制御統合版）
//   ・FORCEキーワード判定（外部JSON）
//   ・スコアリング判断
//   ・検索頻度制御（Throttle統合）
//   ・searchAdapter呼び出し制御
//   ・WEB出力フォーマット統一（重要修正）
// ========================================

const { searchAdapter } = require("../utils/searchAdapter");
const forceRules = require("../config/searchForceRules.json");

// ========================================
// 🧠 内部状態（検索履歴キャッシュ）
// ========================================
const sessionSearchHistory = new Map();

// ========================================
// 🚫 検索制御（Throttle統合）
// ========================================
function canSearch(sessionId, query) {
  const now = Date.now();

  if (!sessionId) sessionId = "global";

  if (!sessionSearchHistory.has(sessionId)) {
    sessionSearchHistory.set(sessionId, []);
  }

  const logs = sessionSearchHistory.get(sessionId);

  // ① 10秒以内の連続検索制限
  const recent = logs.filter(l => now - l.time < 10000);
  if (recent.length >= 2) {
    return false;
  }

  // ② 同一クエリ連打防止（60秒）
  if (logs.some(l => l.query === query && now - l.time < 60000)) {
    return false;
  }

  logs.push({ query, time: now });

  sessionSearchHistory.set(
    sessionId,
    logs.filter(l => now - l.time < 60000)
  );

  return true;
}

// ========================================
// 🧠 スコア計算
// ========================================
function calculateSearchScore(query, context = {}) {
  let score = 0;

  // ① FORCEキーワード（強制検索）
  if (forceRules.force_keywords.some(k => query.includes(k))) {
    score += 0.7;
  }

  // ② 不確実性（記憶不足）
  if (!context.summary || context.summary.length === 0) {
    score += 0.2;
  }

  // ③ 長文（調査系）
  if (query.length > 25) {
    score += 0.15;
  }

  // ④ 高確信メモリは抑制
  if (context.confidence && context.confidence > 0.85) {
    score -= 0.5;
  }

  // ⑤ 雑談系は抑制
  if (
    query.includes("こんにちは") ||
    query.includes("ありがとう")
  ) {
    score -= 0.6;
  }

  return score;
}

// ========================================
// 🧠 メイン
// ========================================
async function webGate(query, context = {}) {

  const sessionId =
    context.sessionId || context.session_id || "global";

  // ====================================
  // 🚫 ① 暴走防止チェック
  // ====================================
  if (!canSearch(sessionId, query)) {
    return {
      query,
      searched: false,
      ok: false,
      reason: "throttled",
      score: 0,
      data: null
    };
  }

  // ====================================
  // 🧠 ② スコア計算
  // ====================================
  const score = calculateSearchScore(query, context);

  // ====================================
  // 🚨 ★追加修正：強制検索ルート
  // ====================================
  const forceHit = forceRules.force_keywords.some(k =>
    query.includes(k)
  );

  // 強制キーワードがヒットした場合はスコア無視で検索実行
  if (forceHit) {
    const result = await searchAdapter(query);

    return {
      query,
      searched: true,
      ok: true,
      force: true,
      score: 1,
      reason: "force_keyword",
      data: result.results || []
    };
  }

  const shouldSearch = score > 0.4;

  // ====================================
  // 🧭 ③ 検索不要
  // ====================================
  if (!shouldSearch) {
    return {
      query,
      searched: false,
      ok: true,
      score,
      reason: "internal knowledge sufficient",
      data: null
    };
  }

  // ====================================
  // 🌐 ④ 実行（searchAdapter直結）
  // ====================================
  const result = await searchAdapter(query);

  // ====================================
  // 🧠 ⑤ 出力統一（重要修正）
  // ====================================

  if (!result || result.ok === false) {
    return {
      query,
      searched: true,
      ok: false,
      score,
      reason: result?.reason || "search_failed",
      data: []
    };
  }

  return {
    query,
    searched: true,
    ok: true,
    score,
    reason: result.results?.length
      ? "ok"
      : "no_results",
    data: result.results || []
  };
}

module.exports = {
  webGate
};
