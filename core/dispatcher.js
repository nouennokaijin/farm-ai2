// ========================================
// FILE: dispatcher.js
// DATE: 2026-05-23
// AUTHOR: OKIURA KAZUO
// PURPOSE: AIなしルーティング（拡張可能設計）
// ROLE: 入力を各ハンドラーへ振り分けるだけ
// NOTE: personaIdを決定して渡すだけ（人格実体化はしない）
// ========================================

// ========================================
// ハンドラー群
// ========================================
const chatHandler = require("../handlers/chatHandler");

// 💤 未実装ハンドラー（今は使わない）
/*
const commandHandler = require("../handlers/commandHandler");
const meetingHandler = require("../handlers/meetingHandler");
const scheduleHandler = require("../handlers/scheduleHandler");
const receiptHandler = require("../handlers/receiptHandler");
const ocrHandler = require("../handlers/ocrHandler");
*/

// ========================================
// 部屋 → 人格IDマッピング（コア設計）
// ※ここでは「IDだけ」を渡す
// ========================================
const roomPersonaMap = {
  "1507420557266780323": "albedo",
  "1507547133790781540": "demiurge",
  "1507837526453391370": "shalltear",
};

// ========================================
// 正規化関数（roomId統一）
// ========================================
function normalizeRoomId(event) {
  const raw =
    event.channelId ||
    event.channel_id ||
    event.channel ||
    event.room ||
    event.guildId ||
    "";

  return String(raw)
    .replace(/[<#>]/g, "")
    .replace(/^#/, "")
    .trim();
}

// ========================================
// メインディスパッチャ
// ========================================
async function dispatcher(event) {
  try {

    const text = (event.text || "").trim();

    // ====================================
    // roomId取得
    // ====================================
    const roomId = normalizeRoomId(event);

    // ====================================
    // ★ 使用人格ID決定（ここが唯一の責務）
    // ====================================
    const personaId = roomPersonaMap[roomId] || "system";

    // ====================================
    // デバッグログ
    // ====================================
    console.log("================================");
    console.log("DISPATCHER START");
    console.log("ROOM ID:", roomId);
    console.log("PERSONA ID:", personaId);
    console.log("TEXT:", text);
    console.log("================================");

    // ====================================
    // 空入力
    // ====================================
    if (!text) {
      return chatHandler({
        ...event,
        text: "（無言入力）",
        personaId,
      });
    }

    // ====================================
    // 1. コマンド（未実装）
    // ====================================
    /*
    if (text.startsWith("/")) {
      return commandHandler.handle(event);
    }
    */

    // ====================================
    // 2. OCR（未実装）
    // ====================================
    /*
    if (
      text.includes("画像") ||
      text.includes("読み取り") ||
      text.includes("OCR") ||
      text.includes("スキャン")
    ) {
      return ocrHandler.handle(event);
    }
    */

    // ====================================
    // 3. 収支（未実装）
    // ====================================
    /*
    if (
      text.includes("レシート") ||
      text.includes("領収書") ||
      text.includes("支出") ||
      text.includes("収入") ||
      text.includes("経費")
    ) {
      return receiptHandler.handle(event);
    }
    */

    // ====================================
    // 4. 会議（未実装）
    // ====================================
    /*
    if (
      text.includes("会議") ||
      text.includes("議題") ||
      text.includes("議論") ||
      text.includes("MTG")
    ) {
      return meetingHandler.handle(event);
    }
    */

    // ====================================
    // 5. スケジュール（未実装）
    // ====================================
    /*
    if (
      text.includes("予定") ||
      text.includes("スケジュール") ||
      text.includes("カレンダー") ||
      text.includes("予約")
    ) {
      return scheduleHandler.handle(event);
    }
    */

    // ====================================
    // 6. デフォルト（雑談）
    // ====================================
    return chatHandler({
      ...event,
      personaId,
    });

  } catch (err) {

    console.error("🔥 Dispatcher Error:", err);

    return chatHandler({
      ...event,
      text: "（システム異常：雑談モードへフォールバック）",
      personaId: "system",
    });
  }
}

// ========================================
module.exports = dispatcher;
