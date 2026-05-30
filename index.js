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
function safeStart(name, modulePath) {
  try {
    console.log("=================================");
    console.log(`🟡 Starting ${name}...`);
    console.log("=================================");

    require(modulePath);

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
safeStart("Discord Gateway", "./index.discord.js");

// ========================================
// 📁 静的ファイル配信設定
// ========================================
// web フォルダ全体を静的配信（将来拡張用）
app.use(express.json());
app.use(express.static("web"));

// ========================================
// 📅 カレンダールート
// ========================================
// /calendar → web/calendar/index.html を返す
app.get("/calendar", (req, res) => {
  res.sendFile(path.join(__dirname, "web", "calendar", "index.html"));
});

// ========================================
// ❤️ ヘルスチェック（重要）
// ========================================
app.get("/", (req, res) => {
  res.send("🟢 AI Gateway Alive");
});

// ========================================
// 🔌 API拡張用プレースホルダー
// ========================================
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
setInterval(() => {
  console.log("💓 AI GATEWAY HEARTBEAT OK");
}, 60000);
