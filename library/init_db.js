const fs = require("fs");
const path = require("path");

// 修正：databaseなし
const DB_PATH = path.join(__dirname, "library_index.json");

// 初期構造
const initData = {
    meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    items: []
};

// 初期化
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initData, null, 2));
    console.log("大図書館JSON 初期化完了");
} else {
    console.log("既に存在しています");
}
