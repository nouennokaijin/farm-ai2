// ========================================
// 📁 FOLDER : units
// 📄 FILE : SummarizerUnit.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// SummarizerUnit（会話圧縮ユニット）
//
// ・一定件数ごとに要約
// ・sessionのsummaryへ格納
// ・historyを間引く役割は持たない（SessionUnit側）
//
// ========================================

const groqService = require("../services/groqService");

const TRIGGER_HISTORY_SIZE = 6;
const SUMMARY_SLICE_SIZE = 3;
const MAX_SUMMARY = 6;

async function tick(session, personaId) {
  const history = session.histories[personaId];
  const summary = session.summaries[personaId];

  if (!history || history.length < TRIGGER_HISTORY_SIZE) return;

  if (session.summarizingLock[personaId]) return;

  session.summarizingLock[personaId] = true;

  try {
    const old = history.splice(0, SUMMARY_SLICE_SIZE);

    const s = await summarize(old, personaId);

    summary.push(s);

    if (summary.length > MAX_SUMMARY) {
      summary.shift();
    }

  } finally {
    session.summarizingLock[personaId] = false;
  }
}

async function summarize(messages, personaId) {
  const text = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join("\n");

  const result = await groqService.chat({
    system: "会話を3〜5行で要約。事実のみ。",
    user: `[${personaId}] ${text}`,
    max_tokens: 80
  });

  return `[${personaId}] ${result}`;
}

module.exports = {
  tick
};
