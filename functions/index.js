// index.js
// 2026/4/27
// okiura kazuo

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
      await dispatch(event);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// Render対策（重要）
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("server running on", PORT);
});
