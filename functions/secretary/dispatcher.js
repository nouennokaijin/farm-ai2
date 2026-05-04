// secretary/dispatcher.js
// 2026/05/04
// 📡 LINEイベントの司令塔
// ・メッセージ受信
// ・ルール判定（ruleEngine）
// ・必要時のみAIへフォールバック
// ・最終的に処理を振り分ける（post / receipt / schedule / ocr / chat）

// ================================
// 🧠 依存モジュール（同一ディレクトリ）
// ================================
const { ruleEngine } = require("./ruleEngine");
const { classifyAI } = require("./classifyAI");
const { ocrTxtAI } = require("./ocrTxtAI");

// ================================
// 🧩 各処理（仮実装）
// ================================
async function handlePost(event) {
  console.log("📝 投稿処理開始");
}

async function handleReceipt(event) {
  console.log("💰 レシート処理開始");
}

async function handleSchedule(event) {
  console.log("📅 スケジュール処理開始");
}

async function handleOCR(event) {
  console.log("🔍 OCR処理開始");
}

async function handleChat(event) {
  console.log("💬 チャット処理開始");
}

// ================================
// 🚀 メイン処理
// ================================
async function dispatcher(event) {
  try {
    console.log("📥 イベント受信:", event.message?.type);

    // ① ルール判定
    let result = await ruleEngine(event);
    console.log("🧠 ルール判定結果:", result);

    // ② AIフォールバック（"0" のときのみ）
    if (result === "0") {
      console.log("🤖 AIフォールバック開始");

      if (event.message?.type === "text") {
        result = await classifyAI(event.message.text || "");
      }

      if (event.message?.type === "image") {
        const imageUrl = event.imageUrl; // Cloudinary等の公開URL想定

        if (!imageUrl) {
          console.warn("⚠️ imageUrl未設定");
          result = "chat";
        } else {
          result = await ocrTxtAI(imageUrl);
        }
      }
    }

    console.log("🎯 最終判定:", result);

    // ③ 分岐
    switch (result) {
      case "post":
        return handlePost(event);
      case "receipt":
        return handleReceipt(event);
      case "schedule":
        return handleSchedule(event);
      case "ocr":
        return handleOCR(event);
      case "chat":
      default:
        return handleChat(event);
    }

  } catch (err) {
    console.error("❌ dispatcherエラー:", err);
  }
}

// ================================
// 📤 エクスポート
// ================================
module.exports = { dispatcher };
