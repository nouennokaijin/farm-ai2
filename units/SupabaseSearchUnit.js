// ========================================
// 📁 FILE: units/SupabaseSearchUnit.js
// 📂 FOLDER: units
// 📅 DATE: 2026-06-20 (revised)
// 👤 AUTHOR: OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// Supabase会話ログ検索Unit
// ・conversation_logsから履歴取得
// ・retrievalService用データ提供
//
// ========================================

const { createClient } = require("@supabase/supabase-js");

// ======================================
// 🔧 Supabase固定設定（logWriterと統一）
// ======================================

const SUPABASE_URL =
  "https://wtipmrssyutdyuuhokcn.supabase.co"; // SupabaseプロジェクトURL固定値（logWriterと統一）

const SUPABASE_KEY =
  "sb_publishable_cWZyPK5GVOZKODDP9ozINQ_vdxZWxoc"; // Supabase公開キー（logWriterと統一）

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ========================================
// SEARCH
// ========================================
async function search({ roomId, personaId, limit = 10 }) {
  try {

    const query = supabase
      .from("conversation_logs")
      .select("*")
      .eq("room_id", roomId);

    // ====================================
    // 🧠 修正①：persona_idフィルタ削除
    // 理由：meeting時にノイズになるため
    // ====================================
    // .eq("persona_id", personaId)

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ SupabaseSearch error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("❌ SupabaseSearch fatal:", err);
    return [];
  }
}

module.exports = { search };
