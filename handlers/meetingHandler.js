// ========================================
// 📁 FILE: meetingHandler.js
// 📂 FOLDER: handlers
// 📅 DATE: 2026-06-20
// 👤 AUTHOR: OKIURA KAZUO
// 🧠 SUMMARY: 固定台本（i++）ベースのターン制会議再生システム
// ========================================

// ================================
// 🧠 IMPORTS
// ================================

// AI生成エンジン（人格思考生成）
const memoryService = require("../services/memoryService");

// ログ書き込み（監査・履歴）
const { writeLog } = require("../core/logWriter");

// ================================
// 🎭 FIXED SCRIPT（発話台本）
// ================================

// 👉 meetingは「思考会議」ではなく「再生システム」
const SCRIPT = [
  "user",        // 1 お題入力
  "aura", "aura", // 2-3 アウラ提案・Proposal
  "mare", "mare", // 4-5 マール提案・Proposal
  "shalltear", "shalltear", // 6-7 シャルティア
  "cocytus", "cocytus", // 8-9 コキュートス
  "sebas", "sebas", // 10-11 セバス
  "demiurge", // 12 デミウルゴス（統合・論破）
  "albedo", "albedo", "albedo" // 13-15 アルベド再構築
];

// ================================
// 🧠 ROOM STORE（メモリ常駐）
// ================================

// roomId → 状態保持
const rooms = new Map();

// ================================
// 🧠 ROOM CONTEXT（最小構造）
// ================================

class RoomContext {

  constructor(roomId) {

    this.roomId = roomId; // 部屋ID

    this.i = 0; // 👉 ターンカウンター（最重要）

    this.locked = false; // 多重実行防止

    this.history = []; // 会話履歴保存
  }

  // 次の発話者取得
  nextSpeaker() {

    // SCRIPT範囲外チェック
    if (this.i >= SCRIPT.length) {
      return null;
    }

    // 現在の発話者取得
    const speaker = SCRIPT[this.i];

    // カウンター進行
    this.i++;

    return speaker;
  }

  // ロック開始
  lock() {
    this.locked = true;
  }

  // ロック解除
  unlock() {
    this.locked = false;
  }

  // リセット
  reset() {
    this.i = 0;
    this.locked = true;
    this.history = [];
  }
}

// ================================
// 🧠 ROOM GETTER
// ================================

function getRoom(roomId) {

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new RoomContext(roomId));
  }

  return rooms.get(roomId);
}

// ================================
// 🎬 MAIN MEETING HANDLER（再生機）
// ================================

async function handleMeeting(event) {

  // roomID取得
  const roomId = event.channelId;

  // room取得
  const room = getRoom(roomId);

  // ================================
  // 🚨 無効状態チェック
  // ================================

  if (room.locked) return; // 処理中なら無視

  // ロック開始
  room.lock();

  try {

    const text = event.text || "";

    // ================================
    // 🎟 発話者決定（i++方式）
    // ================================

    const speaker = room.nextSpeaker();

    // SCRIPT終了時
    if (!speaker) {
      room.unlock();
      return "（会議終了）";
    }

    // ================================
    // 🧾 INPUT LOG
    // ================================

    await writeLog({
      room_id: roomId,
      speaker: "user",
      persona_id: speaker,
      message: text
    });

    // ================================
    // 🧠 AI GENERATION（再生のみ）
    // ================================

    const response = await memoryService.run({
      text,
      personaId: speaker,
      turn: room.i
    });

    // ================================
    // 🧾 OUTPUT LOG
    // ================================

    await writeLog({
      room_id: roomId,
      speaker,
      persona_id: speaker,
      message: response
    });

    // ================================
    // 🧠 HISTORY STORE
    // ================================

    room.history.push({
      speaker,
      text: response
    });

    // ================================
    // 🔓 UNLOCK
    // ================================

    room.unlock();

    return response;

  } catch (err) {

    console.error("🔥 MEETING ERROR:", err);

    room.unlock();

    return "（会議処理エラー）";
  }
}

// ================================
// 🧨 RESET FUNCTION
// ================================

function resetRoom(roomId) {

  const room = getRoom(roomId);

  room.reset();

  console.log("🧨 ROOM RESET:", roomId);
}

// ================================
// 📤 EXPORT
// ================================

module.exports = {
  handleMeeting,
  resetRoom,
  getRoom
};
