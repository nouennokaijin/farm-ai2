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

      const replyText = await dispatch(userMessage);

      await axios.post(
        "https://api.line.me/v2/bot/message/reply",
        {
          replyToken: event.replyToken,
          messages: [{ type: "text", text: replyText || "OK" }],
        },
        {
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
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
