// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（ルーティング中枢）

const axios = require("axios");
const { dispatcherAI } = require("./dispatcherAI");

// ======================================================
// 🧩 Handlers（実行部隊）
// ======================================================
const chatHandler = require("../handlers/chatHandler");
const postHandler = require("../handlers/postHandler");
const receiptHandler = require("../handlers/receiptHandler");
const scheduleHandler = require("../handlers/scheduleHandler");
const ocrHandler = require("../handlers/ocrHandler");

// ======================================================
// 🗺 ルーティングテーブル
// ======================================================
const routeMap = {
  chat: chatHandler,
  post: postHandler,
  receipt: receiptHandler,
  schedule: scheduleHandler,
  ocr: ocrHandler,
};

// ======================================================
// 📊 AIコストログ
// ======================================================
let aiCallCount = 0;

function logAICall(label) {
  aiCallCount++;
  console.log(`📊 AI CALL #${aiCallCount} → ${label}`);
}

// ======================================================
// 🧠 OCR遅延ロード（修正版：関数直呼び防止）
// ======================================================
let handleOCR = null;

function getOCR() {
  if (!handleOCR) {
    const mod = require("../handlers/ocrHandler");
    handleOCR = mod.handleOCR;
  }
  return handleOCR;
}

// ======================================================
// 🧠 ルール判定（軽量分岐）
// ======================================================
function ruleLayer(text = "") {
  const t = (text || "").toLowerCase();

  if (t.includes("投稿") || t.includes("メモ")) return "post";
  if (t.includes("レシート") || t.includes("領収書")) return "receipt";
  if (t.includes("予定") || t.includes("スケジュール")) return "schedule";

  // OCRトリガー（日本語ゆれ対応）
  if (
    t.includes("ocr") ||
    t.includes("おｃｒ") ||
    t.includes("読み取り") ||
    t.includes("画像") ||
    t.includes("写真")
  ) return "ocr";

  return null;
}

// ======================================================
// 📥 LINE画像取得
// ======================================================
async function downloadLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    timeout: 10000,
  });

  return Buffer.from(res.data);
}

// ======================================================
// ⏳ テキスト待機
// ======================================================
function waitForText(event, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const start = Date.now();

    const interval = setInterval(() => {
      const text = event?.message?.text;

      if (text) {
        clearInterval(interval);
        resolve(text);
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 1000);
  });
}

// ======================================================
// 🚚 Handler実行
// ======================================================
async function dispatchToHandler(result, event) {
  if (!result?.route) return null;

  const handler = routeMap[result.route];

  if (typeof handler !== "function") {
    console.warn("⚠️ Handler not found or invalid:", result.route);
    return null;
  }

  console.log(`🚚 HANDOFF → ${result.route}`);

  return await handler({
    event,
    data: result.data,
  });
}

// ======================================================
// 🚀 dispatcher本体
// ======================================================
async function dispatcher(event) {
  try {
    if (!event?.message) return null;

    const type = event.message.type;

    console.log("📥 EVENT TYPE:", type);

    // ==================================================
    // 🖼 IMAGE FLOW
    // ==================================================
    if (type === "image") {
      console.log("🖼 IMAGE FLOW START");

      const imageBuffer = await downloadLineImage(event.message.id);

      const ocr = getOCR();

      const ocrResult = await ocr({
        imageBuffer,
        userId: event.source?.userId,
        messageId: event.message.id,
      });

      const text = ocrResult?.text || ocrResult || "";

      console.log("📄 OCR RESULT:", text);

      let route = ruleLayer(text);

      if (route) {
        console.log("⚡ RULE MATCH (OCR):", route);
        return await dispatchToHandler({ route, data: text }, event);
      }

      console.log("⏳ waiting for follow-up text...");

      const waitedText = await waitForText(event);

      if (waitedText) {
        console.log("📝 TEXT RECEIVED:", waitedText);

        const r = ruleLayer(waitedText);

        if (r) {
          return await dispatchToHandler({ route: r, data: waitedText }, event);
        }
      }

      logAICall("image fallback");

      const routeAI = await dispatcherAI({
        text: waitedText || "",
        ocr: text,
      });

      return await dispatchToHandler({ route: routeAI, data: text }, event);
    }

    // ==================================================
    // 📝 TEXT FLOW
    // ==================================================
    if (type === "text") {
      const text = event.message.text;

      console.log("📝 TEXT:", text);

      const route = ruleLayer(text);

      if (route) {
        console.log("⚡ RULE MATCH:", route);
        return await dispatchToHandler({ route, data: text }, event);
      }

      logAICall("text fallback");

      const routeAI = await dispatcherAI({
        text,
        ocr: "",
      });

      return await dispatchToHandler({ route: routeAI, data: text }, event);
    }

    return null;

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
    return null;
  }
}

module.exports = { dispatcher };
