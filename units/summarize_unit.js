// file: units/summarize_unit.js
// created: 2026-06-24
// author: OKIURA KAZUO
// purpose: AI要約・抽出処理（小説・文章系）

const { chat } = require("../services/groqService");

// 小説・長文の要約（分割対応）
async function summarizeNovel(text) {

    if (!text) return ""; // 空チェック

    const chunkSize = 6000; // 分割サイズ
    const chunks = []; // 分割格納配列

    // テキスト分割
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }

    const partials = []; // 部分要約

    // 各チャンクを要約
    for (const chunk of chunks) {

        const res = await chat({
            system: "あなたは優秀な編集者。重要な展開を落とさず2〜3行で要約してください。",
            user: chunk,
            max_tokens: 200
        });

        partials.push(res.trim()); // 追記
    }

    // 統合
    const combined = partials.join("\n");

    // 最終要約
    const final = await chat({
        system: "あなたは図書館司書。全体の流れと結末を含めて3〜5行で要約してください。",
        user: combined,
        max_tokens: 400
    });

    return final; // 出力
}

// 抽出（パンフ・記事用の簡易構造化）
async function extract(text) {

    if (!text) return ""; // 空チェック

    const res = await chat({
        system: "重要情報だけを箇条書きで構造化してください（項目化）。",
        user: text,
        max_tokens: 300
    });

    return res; // 構造化結果
}

// export
module.exports = {
    summarizeNovel,
    extract
};
