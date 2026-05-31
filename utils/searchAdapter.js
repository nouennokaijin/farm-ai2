// ========================================
// 📁 FOLDER : utils
// 📄 FILE   : searchAdapter.js
// 📅 DATE   : 2026/05/31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// searchAdapter（マルチ検索統合エンジン）
//
// ・複数検索APIを統一インターフェースで扱う
// ・API差異を完全吸収し上位層を単純化
// ・失敗時に自動フォールバック
// ・検索品質を後から評価できる構造
//
// 🎯 コンセプト
// 「検索手段を選ぶ」のではなく
// 「最良の情報を返す」ことを優先する
//
// ========================================

require("dotenv").config();


// ========================================
// 🌐 共通レスポンスフォーマット
// ========================================

function normalizeResult(source, raw, meta = {}) {
  return {
    source,
    timestamp: new Date().toISOString(),

    // 🔍 検索品質評価用（将来用）
    quality: meta.quality ?? 1.0,

    results: (raw?.results || []).map(r => ({
      title: r.title || "",
      snippet: r.snippet || "",
      url: r.url || ""
    }))
  };
}


// ========================================
// 🔌 Tavily（実API接続）
// ========================================

async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      search_depth: "basic"
    })
  });

  if (!res.ok) {
    throw new Error(`Tavily API error: ${res.status}`);
  }

  const data = await res.json();

  return {
    results: (data.results || []).map(r => ({
      title: r.title,
      snippet: r.content,
      url: r.url
    }))
  };
}


// ========================================
// 🔌 SerpAPI（未実装プレースホルダ）
// ========================================

async function serpSearch(query) {
  return {
    results: [
      {
        title: "SerpAPI placeholder",
        snippet: "Not implemented yet",
        url: "https://serpapi.com"
      }
    ]
  };
}


// ========================================
// 🔌 DuckDuckGo（軽量フォールバック）
// ========================================

async function duckDuckGoSearch(query) {
  return {
    results: [
      {
        title: "DDG placeholder",
        snippet: "Lightweight fallback result",
        url: "https://duckduckgo.com"
      }
    ]
  };
}


// ========================================
// 🔌 Wikipedia（知識補完）
// ========================================

async function wikipediaSearch(query) {
  return {
    results: [
      {
        title: "Wikipedia placeholder",
        snippet: "Knowledge base entry",
        url: "https://wikipedia.org"
      }
    ]
  };
}


// ========================================
// 🧠 検索エンジン優先順位（戦略層）
// ========================================

const searchChain = [
  { name: "tavily", fn: tavilySearch, weight: 1.0 },
  { name: "serp", fn: serpSearch, weight: 0.9 },
  { name: "duckduckgo", fn: duckDuckGoSearch, weight: 0.6 },
  { name: "wikipedia", fn: wikipediaSearch, weight: 0.5 }
];


// ========================================
// 🚪 メイン検索エントリ
// ========================================

async function searchAdapter(query, options = {}) {
  let lastError = null;

  for (const engine of searchChain) {
    try {
      const raw = await engine.fn(query);

      // 空結果はスキップ
      if (!raw || !raw.results || raw.results.length === 0) {
        continue;
      }

      return normalizeResult(
        engine.name,
        raw,
        { quality: engine.weight }
      );

    } catch (err) {
      lastError = err;
      continue;
    }
  }

  // ========================================
  // ❌ 全滅時フォールバック
  // ========================================
  return {
    source: "fallback",
    timestamp: new Date().toISOString(),
    quality: 0,
    results: [],
    error: lastError?.message || "all search engines failed"
  };
}


// ========================================
// 📦 EXPORT
// ========================================

module.exports = {
  searchAdapter,
  normalizeResult
};
