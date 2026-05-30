// ========================================
// index.js
// 2026/05/29
// 🚀 AI Multi Gateway Boot (Control Center)
// Okiura Kazuo
// ========================================
//
// 🎯 役割
// ・Discord Gateway 起動管理
// ・Web / API サーバー起動（汎用）
// ・将来拡張用の司令塔
// ・処理ロジックは持たず「起動のみ」担当
// ========================================

// ========================================
// 📦 必要モジュール
// ========================================
const http = require("http");
const express = require("express");
const path = require("path");

// ========================================
// 🌐 Web Server 初期化
// ========================================
const app = express();
const PORT = process.env.PORT || 10000;

console.log("=================================");
console.log("🚀 AI GATEWAY START");
console.log("=================================");

// ========================================
// 🧠 安全起動ラッパー
// ========================================
// モジュール起動失敗時でも全体停止しない設計
function safeStart(name, path) {
  try {
    console.log("=================================");
    console.log(`🟡 Starting ${name}...`);
    console.log("=================================");

    require(path);

    console.log(`✅ ${name} loaded successfully`);
  } catch (err) {
    console.error("=================================");
    console.error(`❌ ${name} failed to load`);
    console.error("=================================");
    console.error(err);
  }
}

// ========================================
// 🤖 Discord Gateway 起動
// ========================================
// Discord BOT群の起動（Shalltear / Albedo etc）
safeStart("Discord Gateway", "./index.discord.js");

// ========================================
// 📁 静的ファイル配信設定
// ========================================
// public/ フォルダをそのままWeb公開
// → calendar.html やJS/CSSを配置する場所
app.use(express.static("public"));

// ========================================
// 📅 カレンダールート
// ========================================
// Webで /calendar にアクセスした時の表示
app.get("/calendar", (req, res) => {
  res.sendFile(path.join(__dirname, "public/calendar.html"));
});

// ========================================
// ❤️ ヘルスチェック（重要）
// ========================================
// Render / 外部監視用
app.get("/", (req, res) => {
  res.send("🟢 AI Gateway Alive");
});

// ========================================
// 🔌 API拡張用プレースホルダー
// ========================================
// 将来 Supabase / Discord / Calendar API をここに追加可能
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    service: "AI Gateway",
    time: new Date().toISOString(),
  });
});

// ========================================
// 🚀 Web Server 起動
// ========================================
app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🌐 Web Server running on port ${PORT}`);
  console.log(`📅 Calendar: /calendar`);
  console.log(`❤️ Health: /`);
  console.log("=================================");
});

// ========================================
// 🎉 起動完了ログ
// ========================================
console.log("=================================");
console.log("🎉 ALL GATEWAYS READY");
console.log("=================================");

// ========================================
// 💓 生存監視（Heartbeat）
// ========================================
// サーバーが落ちてないか確認するためのログ
setInterval(() => {
  console.log("💓 AI GATEWAY HEARTBEAT OK");
}, 60000);
