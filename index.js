// ========================================
// index.js
// 2026/05/18
// 🚀 AI Multi Gateway Boot (Control Center)
// Okiura Kazuo
// ========================================
//
// 🎯 役割
// ・Discord Gateway 起動管理
// ・将来拡張の司令塔
// ・処理は一切しない（起動専用）
// ========================================

const http = require("http");

console.log("=================================");
console.log("🚀 AI GATEWAY START");
console.log("=================================");

// ========================================
// 🧠 安全起動ラッパー
// ========================================
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
safeStart("Discord Gateway", "./index.discord.js");

// ========================================
// 🌐 Render対策用の最小HTTPサーバー
// ========================================
const PORT = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("AI Gateway is running\n");
  })
  .listen(PORT, () => {
    console.log("=================================");
    console.log("🌐 Health server running");
    console.log(`PORT: ${PORT}`);
    console.log("=================================");
  });

// ========================================
// 🎉 起動完了
// ========================================
console.log("=================================");
console.log("🎉 ALL GATEWAYS READY");
console.log("=================================");

// ========================================
// 💓 ヘルス監視（ログ用）
// ========================================
setInterval(() => {
  console.log("💓 AI GATEWAY HEARTBEAT OK");
}, 60000);

