// ========================================
// 📁 FOLDER : utils
// 📄 FILE   : webGate.js
// 📅 DATE   : 2026/05/31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// webGate（進化型AI検索ゲート統合版）
//
// ・スコアベースで検索判断
// ・AI的な検索理由生成（説明可能性）
// ・検索ログ蓄積（学習データ）
// ・ログから重みを簡易調整（擬似学習）
// ・searchAdapterへ直接接続（実行層分離）
//
// 🎯 コンセプト
// 「検索するかどうか」を決めるのがwebGate
// 「検索する」の実行はsearchAdapter
//
// ========================================


// 🧠 searchAdapter（実行層）
const { searchAdapter } = require("./searchAdapter");


// ========================================
// 🧬 学習状態（ゲートの性格パラメータ）
// ========================================
const learningState = {
  keywordWeight: 0.5,
  uncertaintyWeight: 0.4,
  memoryPenalty: 0.6
};


// ========================================
// 📚 知識ベース（検索結果の蓄積）
// ========================================
const knowledgeBase = [];


// ========================================
// 📊 検索ログ（経験データ）
// ========================================
const searchLogs = [];


// ========================================
// 🧠 ① スコア計算
// ========================================
function calculateSearchScore(query, context = {}) {
  let score = 0;

  const externalKeywords = [
    "最新", "今", "今日", "天気", "ニュース",
    "API", "エラー", "バグ", "価格", "仕様"
  ];

  if (externalKeywords.some(k => query.includes(k))) {
    score += learningState.keywordWeight;
  }

  if (context.confidence && context.confidence > 0.85) {
    score -= learningState.memoryPenalty;
  }

  if (context.memory?.has?.(query)) {
    score -= learningState.memoryPenalty;
  }

  if (query.length > 30) {
    score += 0.2;
  }

  return score;
}


// ========================================
// 🧠 ② 検索理由生成（説明層）
// ========================================
function generateSearchReason(query, score) {
  if (score <= 0) {
    return "内部知識で対応可能と判断し検索不要";
  }

  if (score < learningState.uncertaintyWeight) {
    return "不確実性があるため補助的に外部情報を参照";
  }

  return "外部依存度が高く検索が必要と判断";
}


// ========================================
// 📚 ③ 知識吸収（メモリ化）
// ========================================
function ingestSearchResult(query, result) {
  if (!result?.results) return;

  knowledgeBase.push({
    timestamp: new Date().toISOString(),
    query,
    data: result.results.map(r => ({
      title: r.title,
      summary: r.snippet,
      source: r.url
    }))
  });

  if (knowledgeBase.length > 500) {
    knowledgeBase.shift();
  }
}


// ========================================
// 🔍 ④ 内部知識検索
// ========================================
function searchKnowledge(query) {
  return knowledgeBase.filter(k =>
    k.query.includes(query) ||
    k.data.some(d => d.title.includes(query))
  );
}


// ========================================
// 🔁 ⑤ 学習（ログから重み調整）
// ========================================
function updateWeightsFromLogs(logs) {
  let successSearch = 0;
  let wastedSearch = 0;

  for (const log of logs) {
    if (!log.searched) continue;

    if (log.result && log.result.results?.length > 0) {
      successSearch++;
    } else {
      wastedSearch++;
    }
  }

  if (successSearch > wastedSearch) {
    learningState.uncertaintyWeight += 0.02;
  } else {
    learningState.uncertaintyWeight -= 0.02;
  }

  learningState.uncertaintyWeight = Math.max(
    0.1,
    Math.min(1, learningState.uncertaintyWeight)
  );
}


// ========================================
// 🌐 ⑥ メインゲート
// ========================================
async function webGate(query, context = {}) {

  // ① スコア計算
  const score = calculateSearchScore(query, context);

  // ② 検索理由
  const reason = generateSearchReason(query, score, context);

  // ③ 判定
  const shouldSearch =
    score > learningState.uncertaintyWeight;

  let result = null;

  // ====================================
  // 🌐 実行層（ここが本体接続）
  // ====================================
  if (shouldSearch) {
    result = await searchAdapter(query);

    // 知識ベースへ吸収
    ingestSearchResult(query, result);
  }

  // ④ ログ生成
  const log = {
    timestamp: new Date().toISOString(),
    query,
    score,
    reason,
    searched: shouldSearch,
    result
  };

  searchLogs.push(log);

  // ⑤ 擬似学習更新
  updateWeightsFromLogs(searchLogs);

  return {
    query,
    searched: shouldSearch,
    score,
    reason,
    data: result,
    learningState
  };
}


// ========================================
// 📦 EXPORT
// ========================================
module.exports = {
  webGate,
  searchLogs,
  knowledgeBase,
  searchKnowledge,
  calculateSearchScore,
  generateSearchReason
};
