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

const http = require("http");

console.log("=================================");
console.log("🚀 AI GATEWAY START");
console.log("=================================");

// ========================================
// 🧠 安全起動ラッパー
// ========================================
// モジュール起動失敗時でも全体停止しない
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
// Discord BOT 起動
safeStart("Discord Gateway", "./index.discord.js");

// ========================================
// 🌐 ヘルスチェックサーバー
// ========================================
// Render / Cloud 向け死活監視（現在は外部HTTPサーバー未使用）
// ※ http.createServer は未使用化のため削除済み

const PORT = process.env.PORT || 10000;

// ========================================
// 🎉 起動完了
// ========================================
console.log("=================================");
console.log("🎉 ALL GATEWAYS READY");
console.log("=================================");

// ========================================
// 💓 生存監視
// ========================================
// 1分ごとに稼働ログ出力
setInterval(() => {
  console.log("💓 AI GATEWAY HEARTBEAT OK");
}, 60000);
