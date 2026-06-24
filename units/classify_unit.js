// file: units/classify_unit.js
// created: 2026-06-24
// author: OKIURA KAZUO
// purpose: ファイル種別を判定して処理ルートを決める

function classify(file) {

    // 画像・音声・動画はタイトルのみ対象
    if (file.mimeType.includes("image")) return "title_only";
    if (file.mimeType.includes("audio")) return "title_only";
    if (file.mimeType.includes("video")) return "title_only";

    // テキスト・ドキュメント・Excel系は抽出対象
    if (file.name.endsWith(".txt")) return "extract";
    if (file.name.endsWith(".docx")) return "extract";
    if (file.name.endsWith(".xlsx")) return "extract";

    // フォルダはスキップ対象（別処理）
    if (file.mimeType.includes("folder")) return "skip";

    // 小説・不明系はタイトルのみ
    return "title_only";
}

// export
module.exports = { classify };
