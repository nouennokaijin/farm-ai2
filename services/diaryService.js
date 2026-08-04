// =====================================================
// folder : services
// file   : diaryService.js
// date   : 2026-08-04
// author : OKIURA KAZUO
// purpose: 自省録保存サービス
// note   :
//
// 静謐の間で入力した自省録を
// 大図書館へJSON形式で保存する。
//
// 保存先
//
// 大図書館
//    └── 自省録
//          └── 年
//                └── 月
//                      └── YYYY-MM-DD_001.json
//
// AIタグ・AI要約は後日実装予定。
// 現在はJSON保存のみ行う。
//
// =====================================================

const path = require("path");

const {

    DIARY_PATH,

    saveJson,

    ensureDir,

    getNextDiaryNumber

} = require("./libraryService");



// =====================================================
// 自省録タグ生成
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
// 自省録保存メイン処理
//
// 引数
//
// text
// 静謐の間から送られた本文
//
// =====================================================

async function saveDiary(text){

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
    // 自省録
    //    ↓
    // 年
    //    ↓
    // 月
    // ============================================

    const monthFolder =

        path.join(

            DIARY_PATH,

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

        getNextDiaryNumber(

            monthFolder,

            date

        );



    const filename =

        `${date}_${number}.json`;



    const filePath =

        path.join(

            monthFolder,

            filename

        );



    // ============================================
    // 自省録データ生成
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

    saveDiary

};
