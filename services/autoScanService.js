// file: services/autoScanService.js
// created: 2026-06-24
// author: OKIURA KAZUO
// purpose: Drive全体スキャンの統括制御（司令塔）

//require("dotenv").config(); // 環境変数読み込み（Renderでは不要）

const fs = require("fs"); // ファイル操作
const path = require("path"); // パス操作
const { google } = require("googleapis"); // Google Drive API

// ===== units（処理分割モジュール） =====
const { classify } = require("../units/classify_unit"); // ファイル種別判定
const { readFile, buildFullPath, isFolder } = require("../units/file_unit"); // ファイル操作系
const { summarizeNovel, extract } = require("../units/summarize_unit"); // AI要約・抽出

// ===== DBパス（JSONベースの簡易DB） =====
const DB_PATH = path.join(__dirname, "../library/library_index.json");

// ===== 除外フォルダ =====
const EXCLUDE_FOLDERS = [
    "小説",
    "IMG",
    "webダウンロード"
];

// 除外判定
function isExcludedPath(filePath) {
    return EXCLUDE_FOLDERS.some(folder => filePath.includes(folder));
}

// DB読み込み
function loadDB() {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// DB保存
function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Google Drive接続
async function getDrive() {

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"]
    });

    const client = await auth.getClient();

    return google.drive({
        version: "v3",
        auth: client
    });
}

// ===== スキャン本体 =====
async function scanFolder(drive, folderId, db) {

    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id,name,mimeType,parents)",
        supportsAllDrives: true
    });

    const files = res.data.files || [];

    for (const file of files) {

        // ===== 除外フォルダチェック（追加） =====
        if (isExcludedPath(file.name)) {
            console.log("⛔ 除外:", file.name);
            continue;
        }

        // フォルダなら再帰スキャン
        if (isFolder(file)) {

            if (isExcludedPath(file.name)) {
                console.log("⛔ フォルダ除外:", file.name);
                continue;
            }

            await scanFolder(drive, file.id, db);
            continue;
        }

        // 既に登録済みならスキップ
        const exists = db.items.find(i => i.source_path === file.id);
        if (exists) continue;

        // フルパス生成（フォルダ階層）
        const fullPath = await buildFullPath(drive, file);

        // ファイル分類（重要ロジック）
        const type = classify(file);

        let summary = "";

        // ===== テキスト抽出系 =====
        if (type === "extract") {
            const content = await readFile(drive, file.id);
            summary = await extract(content);
        }

        // ===== 小説系（長文要約） =====
        if (type === "title_only_novel") {
            const content = await readFile(drive, file.id);
            summary = await summarizeNovel(content);
        }

        // ===== タイトルのみ系 =====
        if (type === "title_only") {
            summary = file.name;
        }

        // ===== DB登録 =====
        db.items.push({
            id: Date.now().toString(),
            title: file.name,
            tags: [],
            summary,
            category: type,
            source_path: file.id,
            full_path: fullPath,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        console.log("登録:", file.name);

        saveDB(db);
    }
}

// ===== main処理 =====
async function main() {

    const db = loadDB();
    const drive = await getDrive();

    console.log("スキャン開始");

    const ROOT_FOLDER = process.env.GOOGLE_DRIVE_FOLDER_ID;

    await scanFolder(drive, ROOT_FOLDER, db);

    db.meta.updated_at = new Date().toISOString();

    saveDB(db);

    console.log("スキャン完了");
}

main().catch(console.error);
