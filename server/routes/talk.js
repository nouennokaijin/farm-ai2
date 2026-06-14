// ========================================
// 📁 FOLDER : server/routes
// 📄 FILE : talk.js
// 📋 PURPOSE : Webチャットからの会話を受信し、
//              dispatcher経由でAIへ渡すAPIルート
// 📅 DATE : 2026-06-14
// 👤 AUTHOR : OKIURA KAZUO
// ========================================

const express =
require("express");

const router =
express.Router();

const dispatcher =
require("../../core/dispatcher");

router.post(
"/",
async (req,res)=>{

try{

    const text =
    req.body.message || "";

    let aiReply = "";

    await dispatcher({

        text,

        // ====================================
        // WEB経由であることを明示
        // conversation_logs の source に
        // "web" が保存される
        // ====================================
        source:
        "web",

        channelId:
        "1507420557266780323",

        reply:async(message)=>{

            aiReply =
            message;
        }
    });

    res.json({
        success:true,
        reply:aiReply
    });

}
catch(err){

    console.error(err);

    res.status(500).json({
        success:false,
        reply:
        "アルベドとの通信に失敗しました"
    });
}

});

module.exports =
router;
