// secretary/dispatcher.js
// 2026/05/03
// 📡 ルール判定レイヤー + OCR待機 + AIフォールバック + コストログ付き

const axios = require("axios");
const { dispatcherAI } = require("./dispatcherAI");

// ======================================================
// 📊 AI呼び出しログ（コスト監視用）
// ======================================================
let aiCallCount = 0;

function logAICall(label) {
  aiCallCount++;
  console.log(`📊 AI CALL #${aiCallCount} → ${label}`);
}

// ======================================================
// 🧠 OCR遅延ロード
// ======================================================
let handleOCR = null;

function getOCR() {
  if (!handleOCR) {
    const mod = require("../handlers/ocrHandler");
    handleOCR = mod.handleOCR || mod.default || mod;
  }
  return handleOCR;
}

// ======================================================
// 🧾 超軽量ルール判定レイヤー（無料ゾーン）
// ======================================================
function ruleLayer(text = "") {
  const t = text.toLowerCase();

  if (t.includes("投稿")) return "post";
  if (t.includes("レシート")) return "receipt";
  if (t.includes("予定")) return "schedule";
  if (t.includes("画像") || t.includes("写真")) return "ocr";
  if (t.length > 0) return "chat";

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
// ⏳ OCR待機（最大60秒）
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

      console.log("📄 OCR RESULT:", ocrResult);

      // 👉 OCR後にルール判定
      const rule = ruleLayer(ocrResult);

      if (rule) {
        console.log("⚡ RULE MATCH:", rule);
        return { route: rule, data: ocrResult };
      }

      // ==================================================
      // ⏳ テキスト待機（最大60秒）
      // ==================================================
      console.log("⏳ waiting for text...");

      const waitedText = await waitForText(event);

      if (waitedText) {
        console.log("📝 TEXT RECEIVED:", waitedText);

        const r = ruleLayer(waitedText);

        if (r) return { route: r, data: waitedText };
      }

      // ==================================================
      // 🤖 AIフォールバック
      // ==================================================
      logAICall("image fallback");

      const route = await dispatcherAI({
        text: waitedText || "",
        ocr: ocrResult,
      });

      return { route, data: ocrResult };
    }

    // ==================================================
    // 📝 TEXT FLOW
    // ==================================================
    if (type === "text") {

      const text = event.message.text;

      console.log("📝 TEXT:", text);

      // ① ルール判定（無料）
      const rule = ruleLayer(text);

      if (rule) {
        console.log("⚡ RULE MATCH:", rule);
        return { route: rule, data: text };
      }

      // ② AIフォールバック
      logAICall("text fallback");

      const route = await dispatcherAI({
        text,
        ocr: ""
      });

      return { route, data: text };
    }

    return null;

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
    return null;
  }
}

module.exports = { dispatcher };
