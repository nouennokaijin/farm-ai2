// ========================================
// 📁 FILE: retrievalService.js
// 📂 FOLDER: services
// 📅 DATE: 2026-06-21
// 👤 AUTHOR: OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// 統合検索エンジン
//
// ・Supabase記憶検索
// ・Web検索
// ・Drive検索
// ・LLM用Context生成
// ・Context生成ログ出力
//
// ========================================

const SupabaseSearchUnit = require("../units/SupabaseSearchUnit");
const WebGateUnit = require("../units/WebGateUnit");
const GoogleDriveSearchUnit = require("../units/GoogleDriveSearchUnit");
const { searchAdapter } = require("../utils/searchAdapter");

// ========================================
// MAIN
// ========================================
async function build({
  roomId,
  personaId,
  query,
  session
}) {

  // ====================================
  // 🧠 ① Supabase検索
  // ====================================
  const dbLogs =
    await SupabaseSearchUnit.search({
      roomId,
      limit: 10
    });

  // ====================================
  // 🌐 ② Web検索
  // ====================================
  const web =
    await WebGateUnit.webGate(query, {
      history: session?.histories?.[personaId],
      summary: session?.summaries?.[personaId],
      executor: searchAdapter
    });

  // ====================================
  // 📦 ③ Drive検索
  // ====================================
  const drive =
    await GoogleDriveSearchUnit.search({
      query
    });

  // ====================================
  // 🧠 ④ Context生成
  // ====================================
  const context = buildContext({
    query,
    dbLogs,
    web,
    drive
  });

  // ====================================
  // 🧠 LOG① Context生成時
  // ====================================
  console.log("================================");
  console.log("CONTEXT GENERATED");
  console.log("ROOM:", roomId);
  console.log("QUERY:", query);
  console.log("DB COUNT:", context.db.length);
  console.log("WEB COUNT:", context.web.length);
  console.log("DRIVE COUNT:", context.drive.length);
  console.log("================================");

  return context;
}

// ========================================
// CONTEXT BUILDER
// ========================================
function buildContext({
  query,
  dbLogs,
  web,
  drive
}) {

  return {

    // ユーザー入力
    query: query || "No user input.",

    // 会話履歴
    db: (dbLogs || []).map(log => ({
      speaker: log.speaker || "unknown",
      message: log.message || "",
      time: log.created_at || null
    })),

    // Web結果
    web: web?.data?.results || web || [],

    // Drive結果
    drive: drive || []
  };
}

// ========================================
// EXPORT
// ========================================
module.exports = {
  build
};
