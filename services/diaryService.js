// =====================================================
// folder : services
// file   : diaryService.js
// date   : 2026-08-01
// author : OKIURA KAZUO
// purpose: 自省録保存サービス
// note   :
//   静謐の間で入力した自省録をGoogle Driveへ保存する。
//   保存先:
//   大図書館
//      └── 自省録
//          └── 年
//              └── 月
//                  └── YYYY-MM-DD.json
//
//   マルチタグ生成機能を搭載。
// =====================================================



const { Readable } = require("stream");


const {

    getDrive,

    getOrCreateFolder

} = require("./driveService");




// =====================================================
// Google Drive 保存先
//
// Render環境変数
// GOOGLE_DRIVE_FOLDER_ID
//
// 内容:
// 大図書館フォルダID
// =====================================================

const ROOT_FOLDER =
    process.env.GOOGLE_DRIVE_FOLDER_ID;




// =====================================================
// 自省録タグ生成
//
// 現在はキーワード方式。
// 後ほどAI分類へ交換可能。
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
// JSONファイル作成
//
// Google DriveへJSONファイルを保存する。
// =====================================================

async function createJsonFile(

    drive,

    folderId,

    filename,

    data

){


    const stream =
        Readable.from(

            [

                JSON.stringify(
                    data,
                    null,
                    2
                )

            ]

        );



    const res = await drive.files.create({


        requestBody:{


            name:filename,


            parents:[

                folderId

            ]


        },


        media:{


            mimeType:
            "application/json",


            body:stream


        },

        supportsAllDrives: true, 

        keepRevisionForever: false

    });


    console.log(

        "ファイル保存:",

        filename

    );


    // 作成したファイルのIDを返却
    return res.data.id;

}




// =====================================================
// 自省録保存メイン処理
//
// 引数:
// text
// 静謐の間から送られた本文
//
// =====================================================

async function saveDiary(text){



    const drive =
        await getDrive();




    const now =
        new Date();




    // 日付生成

    const year =
        String(
            now.getFullYear()
        );


    const month =
        String(
            now.getMonth()+1
        )
        .padStart(2,"0");



    const day =
        String(
            now.getDate()
        )
        .padStart(2,"0");




    // =================================================
    // フォルダ構成
    //
    // 大図書館
    //    ↓
    // 自省録
    //    ↓
    // 年
    //    ↓
    // 月
    //
    // =================================================



    const diaryFolder =

        await getOrCreateFolder(

            drive,

            "自省録",

            ROOT_FOLDER

        );



    const yearFolder =

        await getOrCreateFolder(

            drive,

            year,

            diaryFolder

        );



    const monthFolder =

        await getOrCreateFolder(

            drive,

            month,

            yearFolder

        );





    // =================================================
    // 保存データ作成
    // =================================================


    const diary = {


        date:

        `${year}-${month}-${day}`,



        text:



        text,



        tags:



        generateTags(text),



        created_at:



        now.toISOString(),



        updated_at:



        now.toISOString()



    };





    // =================================================
    // JSON保存
    // =================================================


    const fileId = await createJsonFile(


        drive,


        monthFolder,


        `${year}-${month}-${day}.json`,


        diary


    );


    // 親フォルダの権限をファイル自体にも継承させ、人間側から削除・管理可能にする処理
    try {
        await drive.permissions.create({
            fileId: fileId,
            supportsAllDrives: true,
            requestBody: {
                role: 'writer',
                type: 'anyone'
            }
        });
    } catch (e) {
        console.error("権限付与エラー:", e.message);
    }



    console.log(

        "自省録登録完了"

    );

}





module.exports = {


    saveDiary


};
