// index.js
// 2026/4/27
// okiura kazuo

// index.js
// 2026/4/25

const express = require("express");
const dispatch = require("./secretary/dispatcher");
require("dotenv").config();

const app = express();

// ===== 必須ミドルウェア（LINE対策）=====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== webhook =====
app.post("/webhook", async (req, res) => {
  try {
    // 🔍 デバッグ①：受信ボディ確認
    console.log("=== RAW BODY ===");
    console.log(JSON.stringify(req.body, null, 2));

    const events = req.body.events;

    if (!Array.isArray(events)) {
      console.log("events is not array");
      return res.sendStatus(200);
    }

    for (const event of events) {
      // 🔍 デバッグ②：イベント単体確認
      console.log("=== EVENT ===");
      console.log(JSON.stringify(event, null, 2));

      await dispatch(event);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("WEBHOOK ERROR:", e);
    res.sendStatus(500);
  }
});

// ===== Render対策 =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("server running on", PORT);
});

