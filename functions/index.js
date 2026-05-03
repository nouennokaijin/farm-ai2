// index.js
// 2026/05/3
// 🌐 LINE webhookサーバー（入口ゲート）
// プロジェクトのファイル構成
//2026/5/3 Okiura kazuo
//
// functions
//　├── index.js
//　├── secretary/
//　│　　　├── dispatcher.js ⇒(分岐)handlers/すべての~Hander.js
//　│　　　│　　　　　　　　 →㈺dispatcherAI.js
//　│　　　├── chatAI.js
//　│　　　├── dispatcherAI.js
//　│　　　├── imageAI.js
//　│　　　├── readbookAI.js
//　│　　　├── receiptAI.js
//　│　　　├── scheduleAI.js
//　│　　　└── writerAI.js
//　├── handlers/
//　│　　　├── chatHandler.js →㈺chatAI.js
//　│　　　│                  →㈺chatLogger.js
//　│　　　│  　　　　　　　　→㈺saveMsgToNotion.js
//　│　　　│
//　│　　　├── ocrHandler.js →㈺imageAI.js
//　│　　　│　　　　　　　　 →㈺saveMsgToNotion.js
//　│　　　│
//　│　　　│
//　│　　　├── postHandler.js →㈺writerAI.js
//　│　　　│　　　　　　　　  →㈺saveMsgToNotion.js
//　│　　　│
//　│　　　│
//　│　　　│
//　│　　　├── receiptHandler.js
//　│　　　└── scheduleHandler.js
//　├── services/
//　│　　　├── saveMsgToNotion.js →㈺cloudinaryClient.js
//　│　　　│　　　　　　　　　　  →㈺cloudinaryUpload.js
//　│　　　│　　　　　　　　　　  →㈺downloadLineMedia.js
//　│　　　│　　　　　　　　　　  →㈺saveMsgToNotion.js
//　│　　　│                      →㈺tagger.js
//  │　　　├──
//　│　　　└──
//　├── utils/
//　│　　　├── chatLogger.js
//　│　　　├── cloudinaryClient.js
//　│　　　├── cloudinaryUpload.js
//　│　　　├── downloadLineMedia.js
//　│　　　├── ocr.js
//　│　　　├── setMsgToNotion.js
//　│　　　├── schedule.js
//　│　　　├── tagger.js
//  │　　　├──
//　│　　　└──
//　├── data/
//　├── config/
//　├── node_modules/
//　├── package.json
//　├── package-lock.json
//　├── .env
//　├── .ignoregit
//　├── ngrok
//　├── ngrok-v3-stable-linux-arm64.zip
//　├──
//　└──

const express = require("express"); 
// Expressサーバー本体（HTTP受付係）

const { dispatcher } = require("./secretary/dispatcher"); 
// 🧠 司令塔関数（イベントを振り分ける脳）

require("dotenv").config(); 
// 環境変数読み込み（APIキーなど）

const app = express(); 
// サーバーインスタンス生成

// ================================
// 📦 middleware（前処理フィルター）
// ================================
app.use(express.json()); 
// JSONリクエストをJSで扱えるように変換

app.use(express.urlencoded({ extended: true })); 
// フォームデータ対応

// ================================
// 🔥 webhook入口（LINE→ここに来る）
// ================================
app.post("/webhook", async (req, res) => {
  try {

    console.log("=== RAW BODY ==="); 
    // 受信データの生ログ確認

    console.log(JSON.stringify(req.body, null, 2)); 
    // JSON構造を見やすく表示

    const events = req.body.events; 
    // LINEイベント配列を取り出す

    if (!Array.isArray(events)) {
      // イベントが壊れていた場合のガード

      console.log("⚠️ events is not array"); 
      return res.sendStatus(200); 
      // LINE側にOKだけ返す（再送防止）
    }

    for (const event of events) {
      // 複数イベントを順番処理

      console.log("=== EVENT ==="); 
      // 個別イベントログ開始

      console.log(JSON.stringify(event, null, 2)); 
      // イベント中身確認

      const result = await dispatcher(event); 
      // 🧠 司令塔にイベントを渡して処理振り分け

      console.log("📤 dispatcher result:", result); 
      // 処理結果ログ（デバッグ用）
    }

    res.sendStatus(200); 
    // 正常終了レスポンス（LINEにOK返却）

  } catch (e) {

    console.error("❌ WEBHOOK ERROR:", e); 
    // エラーログ出力

    res.sendStatus(500); 
    // サーバーエラー返却
  }
});

// ================================
// 🚀 server start（起動）
// ================================
const PORT = process.env.PORT || 10000; 
// ポート番号（環境変数優先）

app.listen(PORT, () => {
  console.log("server running on", PORT); 
  // 起動確認ログ
});
