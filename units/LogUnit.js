// ========================================
// 📁 FOLDER : units
// 📄 FILE : LogUnit.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// LogUnit（会話ログ永続化）
//
// ・Supabaseへログ保存
// ・user / assistant両方記録
//
// ========================================

const { createClient } = require("@supabase/supabase-js");

// ======================================
// 🔧 Supabase固定設定
// ======================================

const SUPABASE_URL =
  "https://wtipmrssyutdyuuhokcn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_cWZyPK5GVOZKODDP9ozINQ_vdxZWxoc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function write({
  sessionId,
  personaId,
  user,
  assistant
}) {
  try {
    await supabase.from("conversation_logs").insert([
      {
        room_id: sessionId,
        persona_id: personaId,
        source: "memoryService",
        speaker: "user",
        message: user
      },
      {
        room_id: sessionId,
        persona_id: personaId,
        source: "memoryService",
        speaker: "ai",
        message: assistant
      }
    ]);

    console.log("✅ LogUnit saved");

  } catch (err) {
    console.error("❌ LogUnit error:", err);
  }
}

module.exports = {
  write
};
