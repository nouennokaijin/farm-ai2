// ========================================
// 📁 FILE: units/GoogleDriveSearchUnit.js
// 📂 FOLDER: units
// 📅 DATE: 2026-06-21
// 👤 AUTHOR: OKIURA KAZUO
// 🧠 SUMMARY:
//   Google Drive検索Unit（未実装安全版）
//   ・未実装を「成功扱い」にしない
//   ・上流で確実に分岐できる形へ統一
//   ・ループバグ防止（空配列禁止設計）
// ========================================

async function search({ query }) { // Google Drive検索メイン関数（入力はクエリ）

  console.log("📦 GoogleDriveSearch (stub):", query); // 呼び出しログ（デバッグ用）

  return { // ★重要：空配列ではなく“状態付きオブジェクト”で返す
    ok: false, // 未実装なので成功扱いにしないフラグ
    status: "not_implemented", // 状態を明示（上流分岐用）
    query: query, // 受け取ったクエリをそのまま保持
    results: [] // データはまだ無い（ただし意味付き構造）
  }; // 戻り値終了
} // search関数終了

module.exports = { search }; // 外部公開（unitとして呼び出し可能化）
