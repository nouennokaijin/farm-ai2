// ========================================
// 📁 FILE: services/retrievalService.js
// 📂 FOLDER: services
// 📅 DATE: 2026-06-20 (final design)
// 👤 AUTHOR: OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// retrievalService（統合検索エンジン最終形）
//
// ・Supabase検索（記憶）
// ・WebGateUnit（判断）
// ・searchAdapter（実行）
// ・Drive検索（将来）
// ・Context生成
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
  // 🧠 ① Supabase（記憶）
  // ====================================
  const dbLogs = await SupabaseSearchUnit.search({
    roomId,
    limit: 10
  });

  // ====================================
  // 🌐 ② WebGate（判断 → 直接実行）
  // ====================================
  const web = await WebGateUnit.webGate(query, {
    history: session?.histories?.[personaId],
    summary: session?.summaries?.[personaId],
    executor: searchAdapter // ← ★追加（直結）
  });

  // ====================================
  // 📦 ③ Drive（未来）
  // ====================================
  const drive = await GoogleDriveSearchUnit.search({
    query
  });

  // ====================================
  // 🧠 ④ Context生成
  // ====================================
  const context = buildContext({
    dbLogs,
    web,
    drive
  });

  return context;
}

// ========================================
// CONTEXT BUILDER
// ========================================
function buildContext({ dbLogs, web, drive }) {

  return {
    db: dbLogs.map(log => ({
      speaker: log.speaker,
      message: log.message,
      time: log.created_at
    })),

    web: web?.data?.results || web || [],

    drive: drive || []
  };
}

module.exports = { build };
