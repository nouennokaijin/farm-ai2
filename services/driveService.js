// =====================================================
// folder : services
// file   : driveService.js
// date   : 2026-08-01
// author : OKIURA KAZUO
// purpose: Google Drive 共通操作サービス
// note   :
//   ナザリック全体で使用するGoogle Drive接続部品。
//   フォルダ作成・取得など共通処理を管理する。
// =====================================================


const { google } = require("googleapis");


// =====================================================
// Google Drive 接続
// =====================================================
// 環境変数
// GOOGLE_CREDENTIALS
// に保存された認証情報を使用する
// =====================================================

async function getDrive(){

    const credentials =
        JSON.parse(
            process.env.GOOGLE_CREDENTIALS
        );


    const auth =
        new google.auth.GoogleAuth({

            credentials,

            scopes:[
                "https://www.googleapis.com/auth/drive"
            ]

        });


    const client =
        await auth.getClient();


    return google.drive({

        version:"v3",

        auth:client

    });

}



// =====================================================
// フォルダ取得・存在しなければ作成
// =====================================================
//
// parentId
// 親フォルダID
//
// name
// 作成するフォルダ名
//
// =====================================================

async function getOrCreateFolder(
    drive,
    name,
    parentId
){


    // 既存フォルダ検索

    const search =
        await drive.files.list({

            q:
            `'${parentId}' in parents and `+
            `name='${name}' and `+
            `mimeType='application/vnd.google-apps.folder' and `+
            `trashed=false`,

            fields:
            "files(id,name)"

        });



    // 存在する場合

    if(
        search.data.files.length > 0
    ){

        return search.data.files[0].id;

    }



    // 存在しない場合、新規作成

    const create =
        await drive.files.create({

            requestBody:{

                name:name,

                mimeType:
                "application/vnd.google-apps.folder",

                parents:[
                    parentId
                ]

            },

            fields:"id"

        });



    console.log(
        "フォルダ作成:",
        name
    );


    return create.data.id;

}



module.exports = {

    getDrive,

    getOrCreateFolder

};
