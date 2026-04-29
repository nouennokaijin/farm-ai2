// utils/drive.js

const { google } = require("googleapis");
const stream = require("stream");

// ===== Google認証 =====
// 環境変数にJSON文字列でサービスアカウントを入れる
let credentials;

try {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} catch (e) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT_JSON parse error");
  credentials = null;
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// ===== Buffer → Stream変換 =====
function bufferToStream(buffer) {
  const readable = new stream.PassThrough();
  readable.end(buffer);
  return readable;
}

// ===== MIME推定（軽量）=====
function detectMimeType(fileName = "") {
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

// ===== Driveアップロード =====
// buffer: ファイル本体
// fileName: ファイル名
// mimeType: 任意（未指定なら推定）
async function uploadToDrive(buffer, fileName, mimeType) {
  try {
    if (!buffer) throw new Error("buffer is empty");

    // MIMEがなければ推定
    const finalMime = mimeType || detectMimeType(fileName);

    // ★ファイル名にタイムスタンプ付与（重複防止）
    const safeName = `${Date.now()}_${fileName}`;

    const res = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // フォルダ指定
      },
      media: {
        mimeType: finalMime,
        body: bufferToStream(buffer),
      },
      fields: "id", // ★軽量化
    });

    const fileId = res.data.id;

    // ===== 公開設定 =====
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // ===== URL（表示安定版）=====
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return url;

  } catch (err) {
    console.error(
      "Drive upload error:",
      err.response?.data || err.message || err
    );
    return null;
  }
}

module.exports = { uploadToDrive };
