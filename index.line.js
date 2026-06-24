// ========================================
// index.line.js
// 2026/05/18
// 🌐 LINE Gateway (Stable Edition)
// Okiura Kazuo
// ========================================
//
// 🎯 役割
// ========================================
// ・LINE Webhook受信
// ・イベント解析
// ・dispatcherへ統一転送
// ・LINE返信処理（将来対応）
// ========================================

const express = require("express");
//require("dotenv").config();

// 🧠 中枢AI dispatcher
const { dispatcher } = require("./secretary/dispatcher");

// ========================================
// 🚀 Express App生成
// ========================================
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// 🔥 ヘルスチェック
// ========================================
app.get("/", (req, res) => {
  console.log("🌐 LINE root access");
  res.status(200).send("LINE BOT SERVER OK");
});

// ========================================
// 🔥 LINE Webhook
// ========================================
app.post("/webhook", async (req, res) => {
  try {
    console.log("=================================");
    console.log("🔥 LINE Webhook Triggered");
    console.log("=================================");

    const events = req.body.events;

    if (!Array.isArray(events)) {
      console.warn("⚠️ Invalid events format");
      return res.sendStatus(200);
    }

    console.log("📦 events:", events.length);

    // ====================================
    // 🧠 イベントループ
    // ====================================
    for (const event of events) {
      console.log("=================================");
      console.log("📩 LINE Event Received");
      console.log("=================================");
      console.log("type:", event.type);
      console.log("message:", event?.message?.text);

      // ====================================
      // 🧠 dispatcherへ統一入力
      // ====================================
      const result = await dispatcher({
        platform: "line",
        input: event?.message?.text,
        raw: event,
      });

      console.log("📤 dispatcher result:");
      console.log(result);

      // ====================================
      // 🗣️ LINE返信（未実装でもOK）
      // ====================================
      if (!result?.reply) {
        console.warn("⚠️ No reply from dispatcher");
      }

      // TODO: LINE Messaging API reply実装予定
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("=================================");
    console.error("❌ LINE Webhook Error");
    console.error("=================================");
    console.error(err);

    res.sendStatus(500);
  }
});

// ========================================
// 🚀 Server Start
// ========================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("🚀 LINE Gateway Started");
  console.log("=================================");
  console.log("🌐 PORT:", PORT);
  console.log("=================================");
});
