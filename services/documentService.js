// =====================================================
// folder : services
// file   : documentService.js
// date   : 2026-08-05
// author : OKIURA KAZUO
// purpose: 文書保存サービス
// note   :
//
// ナザリック内で作成された文書を
// 大図書館へJSON形式で保存する。
//
// 文書の種類はタグで分類する。
// 「自省録」も文書種別の一つであり、
// 特別な保存先は持たない。
//
// 保存先
//
// 大図書館
//    └── 文書
//          └── 年
//                └── 月
//                      └── YYYY-MM-DD_001.json
//
// AIタグ・AI要約・記憶登録は後日行う。
// 現在は文書保存のみ担当する。
//
// =====================================================

const path = require("path");

const {

    DOCUMENT_PATH,

    saveJson,

    ensureDir,

    getNextDiaryNumber

} = require("./libraryService");



// =====================================================
// タグ生成
//
// 現在はキーワード方式。
// 後ほどAI分類へ交換予定。
// =====================================================

function generateTags(text){

    const keywords = [

        "仕事",

        "すき家",

        "農業",

        "開発",

        "AI",

        "家族",

        "健康",

        "学習",

        "反省",

        "改善",

        "成功",

        "失敗",

        "アイデア"

    ];

    return keywords.filter(

        keyword =>

            text.includes(keyword)

    );

}



// =====================================================
// 保存メイン処理
//
// 引数
//
// text
// 静謐の間から送られた本文
//
// =====================================================

async function saveDocument(text){

    const now =
        new Date();



    // 年月日生成

    const year =
        String(
            now.getFullYear()
        );



    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );



    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );



    const date =
        `${year}-${month}-${day}`;



    // ============================================
    // 保存フォルダ
    //
    // 
    //    ↓
    // 年
    //    ↓
    // 月
    // ============================================

    const monthFolder =

        path.join(

            DOCUMENT_PATH,

            year,

            month

        );



    ensureDir(
        monthFolder
    );
    // ============================================
    // ファイル番号取得
    //
    // 同じ日に複数保存する場合
    // YYYY-MM-DD_001.json
    // YYYY-MM-DD_002.json
    //
    // のように連番化
    // ============================================

    const number =

        await getNextDiaryNumber(

            monthFolder,

            date

        );


//    const filename =
//
//        `${date}_${number}.json`;
const filename =

    `${date}_${String(number).padStart(3, "0")}.json`;


    const filePath =

        path.join(

            monthFolder,

            filename

        );



    // ============================================
    // データ生成
    // ============================================

    const diaryData = {


        date,


        createdAt:

            now.toISOString(),


        text,


        tags:

            generateTags(text),


        summary:

            null


    };



    // ============================================
    // JSON保存
    //
    // 実際の保存処理は
    // libraryService担当
    // ============================================

    await saveJson(

        filePath,

        diaryData

    );



    return {

        success:true,

        path:filePath,

        data:diaryData

    };

}



// =====================================================
// export
// =====================================================

module.exports = {

    saveDocument

};
