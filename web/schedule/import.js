// ========================================
// FILE: import.js
// FOLDER: /
// DATE: 2026-06-25
// AUTHOR: OKIURA KAZUO
// PURPOSE:
//   Supabase eventsテーブルへ一括登録
//     予定JSON登録
// OVERVIEW:
//   - JSON貼り付け
//   - Supabase登録
//   - 結果表示
// ========================================

// Supabaseクライアント読み込み
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Supabase URL
const SUPABASE_URL =
"https://stgaqwmdhnddqayqmedi.supabase.co";

// Supabase Publishable Key
const SUPABASE_KEY =
"sb_publishable_cabU7_5aabCnGMdXAvitNw_VsX6JhKk";

// Supabase接続生成
const supabase =
createClient(
SUPABASE_URL,
SUPABASE_KEY
);

// 登録ボタン取得
document
.getElementById("registerBtn")

// クリックイベント
.onclick = async () => {

try {

  // textarea内容取得
  const raw =
    document.getElementById("importJson").value;

  // JSON変換
  const data =
    JSON.parse(raw);

  // eventsテーブルへ登録
  const { error } =
    await supabase
      .from("events")
      .insert(data);

  // エラー判定
  if (error) {
    throw error;
  }

  // 入力欄クリア
  document.getElementById("importJson").value = "";

  // 成功表示
  document.getElementById("result")
    .textContent =
    `登録完了 (${data.length}件)`;

  // 成功アラート
  alert("登録完了");

} catch (err) {

  // コンソール出力
  console.error(err);

  // 失敗表示
  document.getElementById("result")
    .textContent =
    "登録失敗: " + err.message;

  // 失敗アラート
  alert("登録失敗");
}

};