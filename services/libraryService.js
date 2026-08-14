// =====================================================
// folder : services
// file   : libraryService.js
// date   : 2026-08-04
// author : OKIURA KAZUO
// purpose: 大図書館 共通ファイル管理サービス
// note   :
//
// ナザリック全体で利用する共通ライブラリ。
// 大図書館への保存・読込・検索の土台となるサービス。
//
// 【現在実装】
// ・フォルダ作成
// ・JSON保存
// ・JSON読込
// ・ファイル一覧取得
// ・自省録投稿番号取得
//
// 【今後実装予定】
// ・Excel保存・読込
// ・Excel行追加
// ・Word保存
// ・PDF保存
// ・画像保存
// ・index.db更新
// ・全文検索
//
// =====================================================

const fs = require("fs");
const path = require("path");

const {

    LIBRARY_PATH,
    DIARY_PATH,
    MEMORY_PATH,
    DOCUMENT_PATH,
    IMAGE_PATH

} = require("../config/library");



// =====================================================
// フォルダ作成
//
// フォルダが存在しない場合のみ作成する。
// recursive:true により親フォルダも同時作成。
// =====================================================

function ensureDir(dirPath){

    if(!fs.existsSync(dirPath)){

        fs.mkdirSync(
            dirPath,
            {
                recursive:true
            }
        );

    }

}



// =====================================================
// JSON保存
//
// filePath
// 保存先フルパス
//
// data
// 保存するオブジェクト
// =====================================================

function saveJson(
    filePath,
    data
){

    ensureDir(
        path.dirname(filePath)
    );

    fs.writeFileSync(

        filePath,

        JSON.stringify(
            data,
            null,
            2
        ),

        "utf8"

    );

}



// =====================================================
// JSON読込
//
// filePath
// 読み込むJSONファイル
// =====================================================

function loadJson(
    filePath
){

    if(
        !fs.existsSync(filePath)
    ){

        return null;

    }

    return JSON.parse(

        fs.readFileSync(

            filePath,

            "utf8"

        )

    );

}



// =====================================================
// ファイル一覧取得
//
// dirPath
// 対象フォルダ
//
// 戻り値
// ファイル名配列
// =====================================================

function listFiles(
    dirPath
){

    if(
        !fs.existsSync(dirPath)
    ){

        return [];

    }

    return fs.readdirSync(
        dirPath
    );

}
// =====================================================
// 自省録 次回投稿番号取得
//
// dirPath
// 対象フォルダ
//
// date
// YYYY-MM-DD
//
// 戻り値
// 次回投稿番号（1から開始）
//
// 例
//
// 2026-08-04_001.json
// 2026-08-04_002.json
//
// → 3 を返す
// =====================================================

function getNextDiaryNumber(
    dirPath,
    date
){

    ensureDir(dirPath);

    const files =
        listFiles(dirPath);

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
// Export
// =====================================================

module.exports = {

    LIBRARY_PATH,

    DIARY_PATH,

    MEMORY_PATH,

    DOCUMENT_PATH,

    IMAGE_PATH,

    ensureDir,

    saveJson,

    loadJson,

    listFiles,

    getNextDiaryNumber

};
