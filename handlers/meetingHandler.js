// ========================================
// 📁 FILE: meeting.js
// 📂 FOLDER: handlers
// 📅 DATE: 2026-06-20
// 👤 AUTHOR: OKIURA KAZUO
// 🧠 SUMMARY: RoomContextベースのターン制会議制御
// ========================================

// ================================
// 🧠 IMPORTS
// ================================

// AI生成レイヤー（思考エンジン）
const memoryService = require("../services/memoryService");

// DBログ書き込み
const { writeLog } = require("../core/logWriter");

// ================================
// 🚦 STATE（メモリ信号機）
// ================================

const STATE = {
  IDLE: 1,        // 待機状態
  LOCKED: 2,      // 排他ロック中
  PROCESSING: 3,  // AI処理中
  DRAINING: 4     // リセット待機状態
};

// ================================
// 🎭 PERSONA（発言主体）
// ================================

const PERSONA = {
  AURA: "aura",
  MARE: "mare",
  SHALLTEAR: "shalltear",
  COCYTUS: "cocytus",
  SEBAS: "sebas",
  DEMIURGE: "demiurge",
  ALBEDO: "albedo"
};

// ================================
// 🧠 MODE（思考タイプ）
// ================================

const MODE = {
  PROPOSAL: "proposal",
  DESTRUCT: "destruction",
  REBUILD: "rebuild",
  SYNTHESIS: "synthesis"
};

// ================================
// 🌊 MOOD（思考トーン）
// ================================

const MOOD = {
  CALM: "calm",
  AGGRESSIVE: "aggressive",
  STRATEGIC: "strategic",
  CREATIVE: "creative"
};

// ================================
// 🧠 ROOM CONTEXT（生きた状態）
// ================================

class RoomContext {

  constructor(roomId) {
    this.roomId = roomId;              // 部屋ID

    this.state = STATE.IDLE;           // 現在状態
    this.locked = false;               // メモリロック

    this.turn = 0;                    // ターン番号

    this.persona = PERSONA.AURA;      // 現在人格
    this.mode = MODE.PROPOSAL;        // 思考モード
    this.mood = MOOD.CALM;            // 感情状態
  }

  // ロック開始
  lock() {
    this.state = STATE.LOCKED;
    this.locked = true;
  }

  // ロック解除
  unlock() {
    this.state = STATE.IDLE;
    this.locked = false;
  }

  // 処理中
  processing() {
    this.state = STATE.PROCESSING;
  }

  // ターン進行
  nextTurn() {
    this.turn++;
  }

  // モード変更
  setMode(mode) {
    this.mode = mode;
  }

  // 人格変更
  setPersona(persona) {
    this.persona = persona;
  }

  // ムード変更
  setMood(mood) {
    this.mood = mood;
  }

  // リセット（安全停止用）
  reset() {
    this.state = STATE.DRAINING;
    this.locked = true;
  }
}

// ================================
// 🧠 ROOM STORE（メモリ常駐）
// ================================

const rooms = new Map(); // roomId -> RoomContext

// room取得（なければ生成）
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new RoomContext(roomId));
  }
  return rooms.get(roomId);
}

// ================================
// 🧠 MAIN MEETING HANDLER
// ================================

async function handleMeeting(event) {

  // roomID取得
  const roomId = event.channelId;

  // RoomContext取得
  const room = getRoom(roomId);

  // ================================
  // 🚨 RESET / DRAIN CHECK
  // ================================

  if (room.state === STATE.DRAINING) {
    return; // 新規処理完全停止
  }

  // ================================
  // 🚦 LOCK CHECK（多重実行防止）
  // ================================

  if (room.locked) {
    return; // すでに処理中
  }

  // ロック開始
  room.lock();

  try {

    // 処理中状態へ
    room.processing();

    const text = event.text || "";

    // ================================
    // 🧾 INPUT LOG（ユーザー）
    // ================================

    await writeLog({
      room_id: roomId,
      persona_id: room.persona,
      speaker: "user",
      message: text
    });

    // ================================
    // 🧠 AI GENERATION
    // ================================

    const response = await memoryService.run({
      text,
      personaId: room.persona,
      mode: room.mode,
      mood: room.mood,
      turn: room.turn
    });

    // ================================
    // 🧾 OUTPUT LOG（AI）
    // ================================

    await writeLog({
      room_id: roomId,
      persona_id: room.persona,
      speaker: "ai",
      message: response
    });

    // ================================
    // 🔁 TURN UPDATE
    // ================================

    room.nextTurn();

    // ================================
    // 🔓 UNLOCK
    // ================================

    room.unlock();

    return response;

  } catch (err) {

    console.error("🔥 MEETING ERROR:", err);

    // 安全解除
    room.unlock();

    return "（会議処理エラー）";
  }
}

// ================================
// 📤 RESET FUNCTION（安全停止）
// ================================

function resetRoom(roomId) {

  const room = getRoom(roomId);

  // 新規処理停止モード
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
