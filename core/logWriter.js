// core/logWriter.js
// フォルダ: core
// ファイル: logWriter.js
// 概要: Supabaseへ会話ログを書き込む
// 日付: 2026-06-14
// OKIURA　KAZUO

const { createClient } = require("@supabase/supabase-js"); // ←修正: ESM→CJS統一

// ======================================
// 🔧 Supabase固定設定（Render環境依存を排除）
// ======================================

const SUPABASE_URL =
  "https://wtipmrssyutdyuuhokcn.supabase.co"; // SupabaseプロジェクトURL固定値

const SUPABASE_KEY =
  "sb_publishable_cWZyPK5GVOZKODDP9ozINQ_vdxZWxoc"; // Supabase公開キー（認証用）

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY); // Supabase接続インスタンス生成

// ======================================
// 📝 ログ書き込み関数
// ======================================

async function writeLog({
  session_id = null, // 会話セッションID
  room_id, // ルームID（必須）
  persona_id, // AI人格ID
  source, // 送信元情報
  speaker, // "user" | "ai" 発話者種別
  message, // メッセージ本文
  tags = [] // タグ配列
}) {
  try { // 例外防止ラップ開始

    const { error } = await supabase // Supabaseへinsert実行
      .from("conversation_logs") // 対象テーブル
      .insert([
        {
          session_id, // セッションID保存
          room_id, // ルームID保存
          persona_id, // 人格ID保存
          source, // 送信元保存
          speaker, // 発話者保存
          message, // メッセージ保存
          tags // タグ保存
        }
      ]);

    if (error) { // Supabase側エラー処理
      console.error("LOG WRITE ERROR:", error); // エラーログ出力
      return false; // 失敗返却
    }

    return true; // 成功返却

  } catch (err) { // 予期せぬ例外処理
    console.error("LOG WRITE EXCEPTION:", err); // 例外ログ出力
    return false; // 失敗返却
  }
}

module.exports = { writeLog }; // ←修正: CJS統一
