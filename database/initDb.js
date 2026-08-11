/////////////////////////////////////////////////////////////
// folder : database
// file   : initDb.js
// date   : 2026-08-05
// author : OKIURA KAZUO
// purpose: 大図書館インデックスデータベースの初期化
// note   :
//   文書情報を管理するSQLiteデータベース(index.db)を作成する。
//   documentsテーブルを生成し、AI解析状況や要約、タグなどを
//   管理するための基盤となる。
//   テーブルは存在しない場合のみ作成される。
/////////////////////////////////////////////////////////////

// SQLite3ライブラリを読み込む
const sqlite3 = require("sqlite3").verbose();

// パス操作用ライブラリを読み込む
const path = require("path");

// databaseフォルダ内にindex.dbを作成または接続する
const db = new sqlite3.Database(
    path.join(__dirname, "index.db")
);

// シリアル実行開始
// serialize()内の処理は順番に実行される
db.serialize(() => {

    // documentsテーブルを作成する
    // すでに存在する場合は何もしない
    db.run(`
        CREATE TABLE IF NOT EXISTS documents (

            -- 文書を一意に識別するID(UUIDなど)
            id TEXT PRIMARY KEY,

            -- 文書作成日時
            created_at TEXT NOT NULL,

            -- 文書タイトル
            title TEXT,

            -- JSONファイルの保存先
            filepath TEXT NOT NULL,

            -- AI処理状態
            -- pending : 未解析
            -- processing : 解析中
            -- completed : 解析完了
            -- error : エラー
            ai_status TEXT DEFAULT 'pending',

            -- AIが生成した要約
            summary TEXT,

            -- AIが付与したタグ(JSON文字列)
            tags TEXT,

            -- 最終更新日時
            updated_at TEXT
        )
    `);

    // 初期化完了メッセージ
    console.log("✅ index.db 初期化完了");
});

// データベース接続を閉じる
db.close();
