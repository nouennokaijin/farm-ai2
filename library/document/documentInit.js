// =====================================================
// folder : library/document
// file   : documentInit.js
// date   : 2026-08-07
// author : OKIURA KAZUO
// purpose: document.db 初期化
// note   :
//   文書目録データベースを作成する。
//   JSON・TXT・PDF・Excelなどの文書情報を管理する。
// =====================================================

// SQLiteライブラリを読み込む
const sqlite3 = require("sqlite3").verbose();

// 大図書館設定を読み込む
const LIBRARY = require("../../config/library");

// =====================================================
// document.db 初期化
// =====================================================
function initDocumentDB() {

    // document.dbへ接続（存在しなければ自動作成）
    const db = new sqlite3.Database(LIBRARY.DOCUMENT_DB);

    // SQLを順番に実行
    db.serialize(() => {

        // documentsテーブル作成
        db.run(`
            CREATE TABLE IF NOT EXISTS documents (

                -- 管理番号（自動採番）
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                -- ファイル名
                file_name TEXT NOT NULL,

                -- ファイル保存場所（重複禁止）
                file_path TEXT UNIQUE NOT NULL,

                -- ファイル種類
                -- json / txt / md / pdf / docx / xlsx ...
                file_type TEXT,

                -- タイトル
                -- AIまたはユーザーが設定
                title TEXT,

                -- AI要約
                summary TEXT,

                -- AI分類
                -- 自省録・契約書・小説など
                category TEXT,

                -- タグ
                -- 農業,契約,経理,AI...
                tags TEXT,

                -- 元ファイル作成日時
                created_at TEXT,

                -- 元ファイル更新日時
                updated_at TEXT,

                -- DBへ登録した日時
                indexed_at TEXT,

                -- 最後にAIが解析した日時
                last_ai_scan TEXT,

                -- AI解析状態
                -- pending
                -- completed
                ai_status TEXT DEFAULT 'pending'

            )
        `);

    });

    // 初期化完了表示
    console.log("📚 document.db 初期化完了");

    // DBを閉じる
    db.close();
}

// =====================================================
// 外部公開
// =====================================================
module.exports = {
    initDocumentDB
};
