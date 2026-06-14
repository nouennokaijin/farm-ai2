// ========================================
// 📁 FOLDER : units
// 📄 FILE : MemoryUnit.js
// 📅 DATE : 2026-05-31
// 👤 AUTHOR : OKIURA KAZUO
// ========================================
//
// 🧠 SUMMARY
// MemoryUnit（プロンプト用メモリ構築）
//
// ・summary統合
// ・LLM入力用メモリ生成
//
// ========================================

function build(session, personaId) {
  const summary = session.summaries[personaId] || [];
  const history = session.histories[personaId] || [];

  return {
    summary,
    history
  };
}

module.exports = {
  build
};
