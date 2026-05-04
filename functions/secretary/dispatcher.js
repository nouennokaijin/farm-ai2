// secretary/dispatcher.js
// 2026/05/03
// 📡 LINEイベントの司令塔（ルーティング中枢）
//
// このファイルの役割：
// ・LINEイベントを受け取る
// ・text / image を判定する
// ・必要に応じてOCRを実行する
// ・60秒の追加入力待機を行う
// ・ルールベース or AIでルート決定する
// ・最終的にHandlerへ処理を渡す

// ======================================================
// 🌐 HTTP通信ライブラリ（LINE画像取得用）
// ======================================================
const axios = require("axios");

// ======================================================
// 🤖 AIルーティング判定関数（フォールバック用）
// ======================================================
const { dispatcherAI } = require("./dispatcherAI");

// ======================================================
// 🧩 各Handlerの読み込み
// 👉 最終的な処理先（実行部隊）
// ======================================================
const chatHandler = require("../handlers/chatHandler");       
const postHandler = require("../handlers/postHandler");       
const ocrHandler = require("../handlers/ocrHandler");         
const receiptHandler = require("../handlers/receiptHandler"); 
const scheduleHandler = require("../handlers/scheduleHandler");

// ======================================================
// 🗺 ルーティングテーブル
// 👉 route文字列 → 実行Handlerへの変換表
// ======================================================
const routeMap = {
  chat: chatHandler,
  post: postHandler,
  ocr: ocrHandler,
  receipt: receiptHandler,
  schedule: scheduleHandler,
};

// ======================================================
// 📊 AI呼び出し回数カウンター（コスト監視）
// ======================================================
let aiCallCount = 0;

// ======================================================
// 📊 AI呼び出しログ
// ======================================================
function logAICall(label) {
  aiCallCount++;
  console.log(`📊 AI CALL #${aiCallCount} → ${label}`);
}

// ======================================================
// 🧠 OCR関数の遅延ロード
// 👉 循環参照防止 & 初期化遅延
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
// 🧠 超軽量ルール判定レイヤー（無料ゾーン）
// 👉 AIを使わず即座にルート判定する部分
// ======================================================
function ruleLayer(text = "") {
  const t = text.toLowerCase();
/*
  if (t.includes("投稿") || t.includes("メモ")) return "post";
  if (t.includes("レシート") || t.includes("領収書")) return "receipt";
  if (t.includes("予定") || t.includes("スケジュール")) return "schedule";
  if (t.includes("画像") || t.includes("写真") || t.includes("読み取り")) return "ocr";
  if (t.length > 0) return "chat";

  return null;
}
*/
  if (t.includes("投稿") || t.includes("メモ")) {
  return "post";
} else if (t.includes("レシート") || t.includes("領収書")) {
  return "receipt";
} else if (t.includes("予定") || t.includes("スケジュール")) {
  return "schedule";
} else if (t.includes("ocr") || t.includes("おｃｒ") || t.includes("読み取り")) {
  return "ocr";
} else {
  return null;
}


// ======================================================
// 📥 LINE画像ダウンロード
// 👉 messageIdから画像バイナリ取得
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
// ⏳ 60秒テキスト待機（追加入力監視）
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
// 🚚 Handlerへ転送（ルーティング実行）
// ======================================================
async function dispatchToHandler(result, event) {

  if (!result?.route) return null;

  const handler = routeMap[result.route];

  if (!handler) {
    console.warn("⚠️ Unknown route:", result.route);
    return null;
  }

  console.log(`🚚 HANDOFF → ${result.route}`);

  return await handler({
    event,
    data: result.data,
  });
}

// ======================================================
// 🚀 dispatcher本体（司令塔）
// ======================================================
async function dispatcher(event) {

  try {

    if (!event?.message) return null;

    const type = event.message.type;

    console.log("📥 EVENT TYPE:", type);

    // ==================================================
    // 🖼 IMAGE FLOW（画像処理ルート）
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

      let route = ruleLayer(ocrResult);

      if (route) {
        console.log("⚡ RULE MATCH (OCR):", route);

        return await dispatchToHandler(
          { route, data: ocrResult },
          event
        );
      }

      console.log("⏳ waiting for follow-up text...");

      const waitedText = await waitForText(event);

      if (waitedText) {
        console.log("📝 TEXT RECEIVED:", waitedText);

        const r = ruleLayer(waitedText);

        if (r) {
          return await dispatchToHandler(
            { route: r, data: waitedText },
            event
          );
        }
      }

      logAICall("image fallback");

      const routeAI = await dispatcherAI({
        text: waitedText || "",
        ocr: ocrResult,
      });

      return await dispatchToHandler(
        { route: routeAI, data: ocrResult },
        event
      );
    }

    // ==================================================
    // 📝 TEXT FLOW（テキスト処理ルート）
    // ==================================================
    if (type === "text") {

      const text = event.message.text;

      console.log("📝 TEXT:", text);

      const route = ruleLayer(text);

      if (route) {
        console.log("⚡ RULE MATCH:", route);

        return await dispatchToHandler(
          { route, data: text },
          event
        );
      }

      logAICall("text fallback");

      const routeAI = await dispatcherAI({
        text,
        ocr: "",
      });

      return await dispatchToHandler(
        { route: routeAI, data: text },
        event
      );
    }

    return null;

  } catch (err) {
    console.error("🔥 dispatcher error:", err);
    return null;
  }
}

// ======================================================
// 📦 外部公開
// ======================================================
module.exports = { dispatcher };
