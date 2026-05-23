// index.js
// 2026/05/03
// 🌐 LINE webhookサーバー（入口ゲート）
// Okiura Kazuo
//
// 🎯 役割
// ・LINE webhook受信
// ・dispatcherへイベント受け渡し
// ・Renderサーバー起動
// ・デバッグログ出力

// ================================
// 📦 module
// ================================
const express = require("express");
// Expressサーバー本体

require("dotenv").config();
// 環境変数読み込み

const { dispatcher } = require("./secretary/dispatcher");
// 🧠 LINEイベント司令塔

// ================================
// 🚀 app create
// ================================
const app = express();
// Expressインスタンス生成

// ================================
// 📦 middleware
// ================================
app.use(express.json());
// JSONを扱えるように変換

app.use(express.urlencoded({ extended: true }));
// form-data対応

// ================================
// 🔥 root check
// ================================
app.get("/", (req, res) => {

  console.log("🌐 root access");

  res.status(200).send("LINE BOT SERVER OK");
});
// Render疎通確認用

// ================================
// 🔥 webhook入口
// ================================
app.post("/webhook", async (req, res) => {

  try {

    console.log("=================================");
    console.log("🔥 webhook hit");
    console.log("=================================");

    // ================================
    // 📦 raw body log
    // ================================
    console.log("=== RAW BODY ===");

    console.log(JSON.stringify(req.body, null, 2));
    // LINEから受信したJSON確認

    // ================================
    // 📩 events取得
    // ================================
    const events = req.body.events;

    // ================================
    // ⚠️ event validation
    // ================================
    if (!Array.isArray(events)) {

      console.log("⚠️ events is not array");

      return res.sendStatus(200);
    }

    console.log("📦 events length:", events.length);

    // ================================
    // 🧠 event loop
    // ================================
    for (const event of events) {

      console.log("=================================");
      console.log("=== EVENT START ===");
      console.log("=================================");

      console.log(JSON.stringify(event, null, 2));
      // 個別イベント確認

      console.log("📨 event type:", event?.type);

      console.log("📝 message type:", event?.message?.type);

      // ================================
      // 🧠 dispatcher call
      // ================================
      console.log("🧠 dispatcher call start");

      const result = await dispatcher(event);

      console.log("🧠 dispatcher call complete");

      // ================================
      // 📤 dispatcher result
      // ================================
      console.log("📤 dispatcher result:");

      console.log(JSON.stringify(result, null, 2));

      console.log("=================================");
      console.log("=== EVENT END ===");
      console.log("=================================");
    }

    // ================================
    // ✅ success response
    // ================================
    console.log("✅ webhook success");

    return res.sendStatus(200);

  } catch (e) {
    console.error("=================================");
    console.error("❌ WEBHOOK ERROR");
    console.error("=================================");

    console.error(e);

    return res.sendStatus(500);
  }
});

// ================================
// 🚀 server start
// ================================
const PORT = process.env.PORT || 10000;
// Render指定PORT優先

app.listen(PORT, "0.0.0.0", () => {

  console.log("=================================");
  console.log("🚀 server start");
  console.log("=================================");

  console.log("🌐 PORT:", PORT);

  console.log("✅ server running");
});
