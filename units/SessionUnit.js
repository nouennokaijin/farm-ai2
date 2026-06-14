// ========================================
// 📁 FOLDER : units
// 📄 FILE : SessionUnit.js（完成版）
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// SessionUnit（セッション状態管理）
//
// ・session生成
// ・history管理
// ・summary管理
// ・recent取得
//
// ========================================

const sessions = new Map();

const MAX_HISTORY = 12;

// ========================================
// Session取得 / 初期化
// ========================================
function get(sessionId, personaId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      histories: {},
      summaries: {},
      summarizingLock: {}
    });
  }

  const session = sessions.get(sessionId);

  session.histories[personaId] ??= [];
  session.summaries[personaId] ??= [];

  return session;
}

// ========================================
// 履歴追加
// ========================================
function push(session, personaId, msg) {
  const arr = session.histories[personaId];

  arr.push({
    ...msg,
    timestamp: Date.now()
  });

  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }
}

// ========================================
// 直近取得
// ========================================
function recent(session, personaId, n = 5) {
  const arr = session.histories[personaId] || [];
  return arr.slice(-n);
}

// ========================================
// export
// ========================================
module.exports = {
  get,
  push,
  recent
};
