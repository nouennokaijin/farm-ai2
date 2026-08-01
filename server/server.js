// =====================================================
// folder : server
// file   : server.js
// date   : 2026-08-01
// author : OKIURA KAZUO
// purpose: ナザリックWEBサーバー
// note   :
//   WEB画面からの要求を受け取り、
//   各サービスを実行する。
// =====================================================


const express = require("express");

const path = require("path");



// =====================================================
// 自省録サービス読み込み
// serverフォルダから1階層上へ移動
// =====================================================

const {
    saveDiary
} = require("../services/diaryService");



const app = express();



app.use(
    express.json()
);



// =====================================================
// WEB公開
//
// server/
//    server.js
//
// ../web
// =====================================================

app.use(

    express.static(

        path.join(
            __dirname,
            "../web"
        )

    )

);



// =====================================================
// 自省録登録API
//
// POST /api/diary
//
// =====================================================

app.post(

"/api/diary",

async(req,res)=>{


    try{


        await saveDiary(
            req.body.text
        );


        res.json({

            success:true,

            message:
            "自省録保存完了"

        });



    }catch(error){


        console.error(error);


        res.status(500)
        .json({

            success:false

        });


    }


});



// =====================================================
// 起動
// =====================================================

const PORT =
process.env.PORT || 3000;



app.listen(

PORT,

()=>{

console.log(
`Nazarick Server 起動 PORT:${PORT}`
);

}

);
