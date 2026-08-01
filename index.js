// ========================================
// 📁 index.js
// 📅 2026/05/29
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
// ・Nazarick統合Web（index.html）
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
// ・統合Web（index.html）
//
// ========================================
app.use(express.json());
app.use(express.static("web"));

// ========================================
// ✒️ 自省録保存 API
// date   : 2026-08-01
// author : OKIURA KAZUO
//
// 静謐の間から送られた自省録を
// diaryService.js経由でGoogle Driveへ保存する
// ========================================

const { saveDiary } = require("./services/diaryService");


app.post("/api/diary", async (req, res) => {

    try {

        await saveDiary(req.body.text);

        res.json({
            success: true,
            message: "自省録保存完了"
        });

    } catch (err) {

        console.error("自省録保存エラー", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

app.use(
    "/api/talk",
    talkRouter
);

// ========================================
// 🌐 統合Webルート
// ========================================
// Nazarick Unified Web
//
// URL
// /index.html または /
//
// ========================================
app.get("/", (req, res) => {
res.sendFile(
path.join(
__dirname,
"web",
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
// ========================================
app.get("/health", (req, res) => {
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
console.log("🌐 Unified Web : /");
console.log("❤️ Health     : /health");
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
