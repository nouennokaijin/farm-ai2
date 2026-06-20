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
  const now = Date.now(); // 現在時刻取得

  if (!sessionId) sessionId = "global"; // セッション未指定時はglobal扱い

  if (!sessionSearchHistory.has(sessionId)) {
    sessionSearchHistory.set(sessionId, []); // 初期化
  }

  const logs = sessionSearchHistory.get(sessionId); // 履歴取得

  // ① 10秒以内の連続検索制限
  const recent = logs.filter(l => now - l.time < 10000); // 直近10秒抽出
  if (recent.length >= 2) {
    return false; // 検索過多防止
  }

  // ② 同一クエリ連打防止（60秒）
  if (logs.some(l => l.query === query && now - l.time < 60000)) {
    return false; // 同じ検索禁止
  }

  logs.push({ query, time: now }); // 履歴追加

  // 古いログ削除
  sessionSearchHistory.set(
    sessionId,
    logs.filter(l => now - l.time < 60000)
  );

  return true; // 検索許可
}

// ========================================
// 🧠 スコア計算
// ========================================
function calculateSearchScore(query, context = {}) {
  let score = 0; // 初期スコア

  // ① FORCEキーワード（強制検索）
  if (forceRules.force_keywords.some(k => query.includes(k))) {
    score += 0.7; // 強制加点
  }

  // ② 不確実性（記憶不足）
  if (!context.summary || context.summary.length === 0) {
    score += 0.2; // 情報不足加点
  }

  // ③ 長文（調査系）
  if (query.length > 25) {
    score += 0.15; // 調査系加点
  }

  // ④ 高確信メモリは抑制
  if (context.confidence && context.confidence > 0.85) {
    score -= 0.5; // 抑制
  }

  // ⑤ 雑談系は抑制
  if (
    query.includes("こんにちは") ||
    query.includes("ありがとう")
  ) {
    score -= 0.6; // 雑談抑制
  }

  return score; // 最終スコア
}

// ========================================
// 🧠 メイン
// ========================================
async function webGate(query, context = {}) {

  const sessionId =
    context.sessionId || context.session_id || "global"; // セッション取得

  // ====================================
  // 🚫 ① 暴走防止チェック
  // ====================================
  if (!canSearch(sessionId, query)) {
    return {
      query, // 入力クエリ
      searched: false, // 未検索
      ok: false, // 統一フラグ追加（重要）
      reason: "throttled", // 制限理由
      score: 0, // スコア
      data: null // データなし
    };
  }

  // ====================================
  // 🧠 ② スコア計算
  // ====================================
  const score = calculateSearchScore(query, context); // スコア算出

  const shouldSearch =
    score > 0.4; // 閾値判定

  // ====================================
  // 🧭 ③ 検索不要
  // ====================================
  if (!shouldSearch) {
    return {
      query, // 入力クエリ
      searched: false, // 検索なし
      ok: true, // 内部知識扱い（重要：成功扱い）
      score, // スコア
      reason: "internal knowledge sufficient", // 理由
      data: null // データなし
    };
  }

  // ====================================
  // 🌐 ④ 実行（searchAdapter直結）
  // ====================================
  const result = await searchAdapter(query); // 外部検索実行

  // ====================================
  // 🧠 ⑤ 出力統一（重要修正）
  // ====================================

  // ❌ 空・未定義・失敗を正規化
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

  // ✅ 正常系（空でも意味を保持）
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
