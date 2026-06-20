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
// const memoryService = require("../services/memoryService");

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

  nextSpeaker() {

    if (this.i >= SCRIPT.length) {
      return null;
    }

    const speaker = SCRIPT[this.i];

    this.i++;

    return speaker;
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

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

  const roomId = event.channelId;

  const room = getRoom(roomId);

  if (room.locked) return;

  room.lock();

  try {

    const text = event.text || "";

    const speaker = room.nextSpeaker();

    if (!speaker) {
      room.unlock();
      return "（会議終了）";
    }

    await writeLog({
      room_id: roomId,
      speaker: "user",
      persona_id: speaker,
      message: text
    });

    // ================================
    // 🧠 AI GENERATION（簡易代替）
    // ================================
    const response = `${speaker}: ${text}`;

    await writeLog({
      room_id: roomId,
      speaker,
      persona_id: speaker,
      message: response
    });

    room.history.push({
      speaker,
      text: response
    });

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
