// =====================================================
// Dropbox版 大図書館サービス
// =====================================================

require("dotenv").config();

const { Dropbox } = require("dropbox");

const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
});


// =====================================================
// JSON保存
// =====================================================

async function saveJson(
    dropboxPath,
    data
){

    await dbx.filesUpload({

        path: dropboxPath,

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
    dropboxPath
){

    const result =
        await dbx.filesDownload({

            path: dropboxPath

        });

const contents =
    result.result.fileBlob ||
    result.result.fileBinary;

const text =
    Buffer.from(contents).toString("utf8");

return JSON.parse(text);

//    const text =
//    await result.result.fileBlob.text();

//    return JSON.parse(text);

}


// =====================================================
// Export
// =====================================================

module.exports = {

    saveJson,
    loadJson

};
