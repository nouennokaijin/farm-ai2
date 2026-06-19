// ========================================
// FILE: dispatcher.js
// DATE: 2026-06-20
// AUTHOR: OKIURA KAZUO
// PURPOSE: AIなしルーティング（拡張可能設計）
// ROLE: 入力を各ハンドラーへ振り分けるだけ
// NOTE: personaIdを決定して渡すだけ（人格実体化はしない）
// ========================================

// ========================================
// ハンドラー群
// ========================================
const chatHandler = require("../handlers/chatHandler");

// 🧠 ログ書き込み追加（NEW）
const { writeLog } = require("../core/logWriter");

// 🧼 ★追加：入力正規化（入口統一レイヤー）
// Discord / LINE / Webhook などの差異をここで吸収する
function normalizeEvent(event) {
  return {
    ...event,

    // テキスト統一（複数ソース対応）
    text: (event.text || event.content || event.message || "").trim(),

    // room系統のゆれ吸収（後段normalizeRoomIdと整合）
    channelId: event.channelId || event.channel_id || event.channel || event.room || event.guildId || event.room_id || "",

    // sourceが未定義の場合の補完
    source: event.source || "discord",
  };
}

// 💤 未実装ハンドラー（今は使わない）
/*
const commandHandler = require("../handlers/commandHandler");
const meetingHandler = require("../handlers/meetingHandler");
const scheduleHandler = require("../handlers/scheduleHandler");
const receiptHandler = require("../handlers/receiptHandler");
const ocrHandler = require("../handlers/ocrHandler");
*/

// ========================================
// 部屋 → 設定マップ（コア設計）
// 2026-06-20
//
// 将来の会議室・執務室対応のため
// 「部屋 → persona」ではなく
// 「部屋 → config」へ進化
//
// chat:
// {
//   type: "chat",
//   personaId: "albedo"
// }
//
// meeting:
// {
//   type: "meeting",
//   participants: [...]
// }
// ========================================
const roomConfigMap = {
  "1507420557266780323": {
    type: "chat",
    personaId: "albedo"
  },

  "1507547133790781540": {
    type: "chat",
    personaId: "demiurge"
  },

  "1507837526453391370": {
    type: "chat",
    personaId: "shalltear"
  },

  "1517617334473330789": {
    type: "chat",
    personaId: "aura"
  },

  "1517408295801851974": {
    type: "chat",
    personaId: "mare"
  },

  "1517620085383106560": {
    type: "chat",
    personaId: "cocytus"
  },

  "1517620931621818499": {
    type: "chat",
    personaId: "sebas"
  }

  "1506369391762079957": {
    type: "meeting",
    participants: [
    "albedo",
    "demiurge",
    "shalltear",
    "aura",
    "mare",
    "cocytus",
    "sebas"
    ]
  }
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

    // 🧼 ★追加：ここで必ずイベントを正規化（入口統一）
    event = normalizeEvent(event);

    const text = (event.text || "").trim();

    // ====================================
    // roomId取得
    // ====================================
    const roomId = normalizeRoomId(event);

    // ====================================
    // ★ 部屋設定取得
    // ====================================
    const roomConfig =
      roomConfigMap[roomId] || null;

    // ====================================
    // ★ 使用人格ID決定
    // ====================================
    const personaId =
      roomConfig?.personaId || "system";

    // ====================================
    // デバッグログ
    // ====================================
    console.log("================================");
    console.log("DISPATCHER START");
    console.log("ROOM ID:", roomId);
    console.log("ROOM CONFIG:", roomConfig);
    console.log("PERSONA ID:", personaId);
    console.log("TEXT:", text);
    console.log("SOURCE:", event.source);
    console.log("================================");

    // ====================================
    // 空入力
    // ====================================
    if (!text) {
      const result = await chatHandler({
        ...event,
        text: "（無言入力）",
        personaId,
      });

      // 🧠 LOG（NEW）
      await writeLog({
        session_id: event.session_id || null,
        room_id: roomId,
        persona_id: personaId,
        source: event.source || "unknown",
        speaker: "user",
        message: "(empty input)",
        tags: []
      });

      return result;
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

    const result = await chatHandler({
      ...event,
      personaId,
    });

    // 🧠 LOG（NEW）
    await writeLog({
      session_id: event.session_id || null,
      room_id: roomId,
      persona_id: personaId,
      source: event.source || "unknown",
      speaker: "user",
      message: text,
      tags: []
    });

    // AI応答もログ
    await writeLog({
      session_id: event.session_id || null,
      room_id: roomId,
      persona_id: personaId,
      source: event.source || "ai",
      speaker: "ai",
      message: result?.message || result || "",
      tags: []
    });

    return result;

  } catch (err) {

    console.error("🔥 Dispatcher Error:", err);

    const fallback = await chatHandler({
      ...event,
      text: "（システム異常：雑談モードへフォールバック）",
      personaId: "system",
    });

    // 🧠 ERROR LOG（NEW）
    await writeLog({
      session_id: event.session_id || null,
      room_id: normalizeRoomId(event),
      persona_id: "system",
      source: event.source || "error",
      speaker: "ai",
      message: "dispatcher error fallback triggered",
      tags: ["error"]
    });

    return fallback;
  }
}

// ========================================
module.exports = dispatcher;
