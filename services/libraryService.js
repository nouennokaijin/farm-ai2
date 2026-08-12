// =====================================================
// file   : services/libraryService.js
// purpose: ナザリック大図書館 共通ファイル管理サービス
// storage: Dropbox
// =====================================================

require("dotenv").config();

const { Dropbox } = require("dropbox");

const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
});


// =====================================================
// Dropboxフォルダ作成
//
// Dropboxでは、ファイルを保存するときに
// 必要な親フォルダも自動的に作成されるため、
// 基本的には何もしない。
// =====================================================

//function ensureDir(dirPath){

//    return true;

//}


// Dropbox上にフォルダを作成する
async function ensureDir(dirPath){

    try {

        // Dropboxにフォルダを作成
        await dbx.filesCreateFolderV2({
            path: dirPath
        });

        // 作成成功
        console.log(
            "📁 Dropboxフォルダ作成:",
            dirPath
        );

    } catch(error) {

        // すでに存在する場合は問題なし
        const summary =
            error?.error?.error_summary || "";

        if(
            summary.includes("conflict")
        ){

            console.log(
                "📁 Dropboxフォルダ既存:",
                dirPath
            );

        } else {

            // その他のエラーは呼び出し元へ返す
            throw error;

        }

    }

}



// =====================================================
// JSON保存
// =====================================================

async function saveJson(
    filePath,
    data
){

    await dbx.filesUpload({

        path: filePath,

        contents:
            JSON.stringify(
                data,
                null,
                2
            ),

        mode: {
            ".tag": "overwrite"
        }

    });

}


// =====================================================
// JSON読込
// =====================================================

async function loadJson(
    filePath
){

    const result =
        await dbx.filesDownload({

            path: filePath

        });


    const contents =
        result.result.fileBlob ||
        result.result.fileBinary;


    const text =
        Buffer
            .from(contents)
            .toString("utf8");


    return JSON.parse(text);

}


// =====================================================
// ファイル一覧取得
// =====================================================

async function listFiles(
    dirPath
){

    const result =
        await dbx.filesListFolder({

            path: dirPath

        });


    return result.result.entries
        .filter(
            entry =>
                entry[".tag"] === "file"
        )
        .map(
            entry =>
                entry.name
        );

}


// =====================================================
// 自省録・文書番号取得
// =====================================================

async function getNextDiaryNumber(
    dirPath,
    date
){

    let files = [];

    try {

        files =
            await listFiles(
                dirPath
            );

    } catch(error) {

        // フォルダが存在しない場合
        // 最初の番号として扱う

        return 1;

    }


    const targetFiles =
        files.filter(

            file =>

                file.startsWith(
                    `${date}_`
                ) &&

                file.endsWith(
                    ".json"
                )

        );


    if(
        targetFiles.length === 0
    ){

        return 1;

    }


    let maxNumber = 0;


    for(
        const file of targetFiles
    ){

        const match =
            file.match(
                /_(\d+)\.json$/
            );


        if(match){

            const number =
                Number(
                    match[1]
                );


            if(
                number > maxNumber
            ){

                maxNumber =
                    number;

            }

        }

    }


    return maxNumber + 1;

}


// =====================================================
// 大図書館パス
// =====================================================

const LIBRARY_PATH =
    "/大図書館";

const DIARY_PATH =
    "/大図書館/自省録";

const MEMORY_PATH =
    "/大図書館/記憶";

const DOCUMENT_PATH =
    "/大図書館/書庫/文書";

const IMAGE_PATH =
    "/大図書館/画像";

// =====================================================
// 大図書館 基本フォルダ作成
// =====================================================

async function ensureLibraryFolders(){

    // 大図書館の基本フォルダ一覧
    const folders = [

        "/大図書館",
        "/大図書館/書庫",
        "/大図書館/書庫/文書",
        "/大図書館/書庫/小説",
        "/大図書館/書庫/小説/オーバーロード",
        "/大図書館/書庫/小説/銀河英雄伝説",
        "/大図書館/画像",
        "/大図書館/記憶"

    ];

    // フォルダを順番に作成
    for(
        const folder of folders
    ){

        await ensureDir(
            folder
        );

    }

}

// =====================================================
// Export
// =====================================================

module.exports = {

    LIBRARY_PATH,

    DIARY_PATH,

    MEMORY_PATH,

    DOCUMENT_PATH,

    IMAGE_PATH,

    ensureDir,

    ensureLibraryFolders,

    saveJson,

    loadJson,

    listFiles,

    getNextDiaryNumber

};
