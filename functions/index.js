/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
//exports.hello = onRequest((req, res) => {
//  const name = req.query.name || "keiさん";
//  res.send(`Hello ${name}🔥`);
//});
//const {onRequest} = require("firebase-functions/https"

//const functions = require("firebase-functions");
//const axios = require("axios");

//exports.lineWebhook = functions.https.onRequest(async (req, res) => {
//  const events = req.body.events;

const express = require("express");
const axios = require("axios");
const functions = require("firebase-functions");
const { dispatch } = require("./secretary/dispatcher");
require("dotenv").config();

const app = express();
app.use(express.json());

const LINE_TOKEN = process.env.LINE_TOKEN;

app.post("/", async (req, res) => {
  try {
    const events = req.body.events;

    if (!Array.isArray(events)) {
      console.log("eventsが配列じゃない:", events);
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const userMessage = event.message.text;
      console.log("ユーザー:", userMessage);

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
    console.error("エラー:", err.message);
    res.sendStatus(500);
  }
});

exports.lineWebhook = functions.https.onRequest(app);

