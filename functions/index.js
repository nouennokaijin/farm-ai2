// index.js
// 2026/04/25
// 🌐 LINE webhookサーバー

const express = require("express");
const { dispatcher } = require("./secretary/dispatcher"); // ← 明示的に分割
require("dotenv").config();

const app = express();

// ================================
// 📦 middleware
// ================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// 🔥 webhook入口
// ================================
app.post("/webhook", async (req, res) => {
  try {
    console.log("=== RAW BODY ===");
    console.log(JSON.stringify(req.body, null, 2));

    const events = req.body.events;

    if (!Array.isArray(events)) {
      console.log("⚠️ events is not array");
      return res.sendStatus(200);
    }

    for (const event of events) {
      console.log("=== EVENT ===");
      console.log(JSON.stringify(event, null, 2));

      // 🚀 dispatcher呼び出し
      const result = await dispatcher(event);

      // 🔍 追跡ログ（デバッグ強化）
      console.log("📤 dispatcher result:", result);
    }

    res.sendStatus(200);

  } catch (e) {
    console.error("❌ WEBHOOK ERROR:", e);
    res.sendStatus(500);
  }
});

// ================================
// 🚀 server start
// ================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("server running on", PORT);
});
