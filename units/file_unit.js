// file: units/file_unit.js
// created: 2026-06-24
// author: OKIURA KAZUO
// purpose: Driveファイルの読み込み・パス生成・種別判定補助

const fs = require("fs"); // Node標準FSモジュール
const path = require("path"); // パス操作用

// Google Driveからファイル内容を読み取る
async function readFile(drive, fileId) {

    // Drive APIでストリーム取得
    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
    );

    // ストリームを文字列化
    return await new Promise((resolve, reject) => {
        let data = ""; // 受け取りバッファ

        res.data.on("data", chunk => {
            data += chunk.toString("utf-8"); // 追記
        });

        res.data.on("end", () => resolve(data)); // 完了
        res.data.on("error", reject); // エラー処理
    });
}

// フォルダを辿ってフルパスを生成
async function buildFullPath(drive, file) {

    const parts = [file.name]; // 初期値はファイル名
    let parentId = file.parents?.[0]; // 親フォルダID

    // 親を上に辿る
    while (parentId) {

        const parent = await drive.files.get({
            fileId: parentId,
            fields: "id,name,parents"
        });

        parts.unshift(parent.data.name); // 先頭に追加

        parentId = parent.data.parents?.[0]; // 次の親へ
    }

    return parts.join("/"); // パス生成
}

// フォルダ判定
function isFolder(file) {
    return (
        file.mimeType === "application/vnd.google-apps.folder" ||
        file.mimeType.includes("folder")
    );
}

// テキスト判定
function isText(file) {
    return (
        file.name.endsWith(".txt") ||
        file.mimeType.includes("text/plain")
    );
}

// export
module.exports = {
    readFile,
    buildFullPath,
    isFolder,
    isText
};
