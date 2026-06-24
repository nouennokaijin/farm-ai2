const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "database/library_index.json");

// JSON読み込み
function loadDB() {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// JSON保存
function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// タグ簡易生成（仮）
function generateTags(text) {
    const keywords = ["AI", "思考", "技術", "感情", "学習", "記録"];
    return keywords.filter(k => text.includes(k)).slice(0, 3);
}

// 登録関数
function registerItem({ title, text, category, source_path }) {
    const db = loadDB();

    const now = new Date().toISOString();

    const item = {
        id: Date.now().toString(),
        title,
        tags: generateTags(text),
        summary: text.slice(0, 80),
        category,
        source_path,
        created_at: now,
        updated_at: now
    };

    db.items.push(item);
    db.meta.updated_at = now;

    saveDB(db);

    console.log("登録完了:", item.title);
}

// テスト登録
registerItem({
    title: "テストメモ",
    text: "AI 思考 記録についてのテストデータ",
    category: "level6",
    source_path: "drive/test.txt"
});
