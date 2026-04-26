// index.js
// 2026/4/25
// Okiura Kazuo

const express = require("express");
const dispatch = require("./secretary/dispatcher");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events;

    if (!Array.isArray(events)) return res.sendStatus(200);

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const userMessage = event.message.text;

//      await dispatch(userMessage, event);
      await dispatch(event);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000);

