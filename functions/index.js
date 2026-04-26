// index.js
// 2026/4/25
// Okiura Kazuo

const express = require("express");
const axios = require("axios");
const { dispatch } = require("./secretary/dispatcher");
require("dotenv").config();

const app = express();
app.use(express.json());

const LINE_TOKEN = process.env.LINE_TOKEN;

// Webhook
app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events;

    if (!Array.isArray(events)) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const userMessage = event.message.text;

      // 👉 LINEのreplyはdispatcherでやるのでeventごと渡す
      await dispatch(userMessage, event, LINE_TOKEN);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
