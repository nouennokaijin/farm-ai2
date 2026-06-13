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
//
// 🌐 現在のWeb機能
// ・Nazarick Calendar
// ・Nazarick Library
//
// 🔮 将来拡張予定
// ・HQ（司令室）
// ・Meeting（守護者会議室）
// ・Farm（農園管理）
// ========================================

// ========================================
// 📦 必要モジュール
// ========================================
const http = require("http");
const express = require("express");
const path = require("path");

const talkRouter =
require("./server/routes/talk");


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
// 将来的に複数Gatewayを追加しても安全
// ========================================
function safeStart(name, modulePath) {
try {
console.log("=================================");
console.log("🟡 Starting ${name}...");
console.log("=================================");

require(modulePath);

console.log(`✅ ${name} loaded successfully`);

} catch (err) {
console.error("=================================");
console.error("❌ ${name} failed to load");
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
// web フォルダ全体を静的配信
//
// 現在
// ・/calendar
// ・/library
//
// 将来
// ・/hq
// ・/meeting
// ・/farm
// などを追加予定
// ========================================
app.use(express.json());
app.use(express.static("web"));

app.use(
    "/api/talk",
    talkRouter
);


// ========================================
// 📅 カレンダールート
// ========================================
// Nazarick Calendar
//
// URL
// /calendar
//
// 配信先
// web/calendar/index.html
//
// 担当
// シャルティア
// ========================================
app.get("/calendar", (req, res) => {
res.sendFile(
path.join(
__dirname,
"web",
"calendar",
"index.html"
)
);
});

// ========================================
// 📚 ナザリック知識庫ルート
// ========================================
// Nazarick Library
//
// URL
// /library
//
// 配信先
// web/library/index.html
//
// 担当
// ユリ・アルファ
//
// 役割
// ・知識登録
// ・知識検索
// ・URL保存
// ・会議資料保存
// ・会議結果保存
// ========================================
app.get("/library", (req, res) => {
res.sendFile(
path.join(
__dirname,
"web",
"library",
"index.html"
)
);
});

// ========================================
// ❤️ ヘルスチェック
// ========================================
// Renderなどの監視用
//
// URL
// /
//
// 正常時
// 🟢 AI Gateway Alive
// ========================================
app.get("/", (req, res) => {
res.send("🟢 AI Gateway Alive");
});

// ========================================
// 🔌 API状態確認
// ========================================
// 将来の外部連携確認用
//
// URL
// /api/status
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
console.log("🌐 Web Server running on port ${PORT}");
console.log("📅 Calendar : /calendar");
console.log("📚 Library  : /library");
console.log("❤️ Health   : /");
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
// 1分ごとに生存確認ログを出力
// Renderログ監視用
// ========================================
setInterval(() => {
console.log("💓 AI GATEWAY HEARTBEAT OK");
}, 60000);
