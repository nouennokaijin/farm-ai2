// utils/firebaseUpload.js

// ===== Firebase Adminからバケット取得 =====
// firebaseAdmin.js 側で bucket を export している前提
const { bucket } = require("./firebaseAdmin");

// ===== Node.js標準のcryptoを使用 =====
const crypto = require("crypto");

// ===== Firebase Storageへアップロード =====
// buffer   : LINEから取得したバイナリ
// fileName : 元ファイル名
// mimeType : 画像 or ファイル種別
async function uploadToFirebase(buffer, fileName, mimeType = "image/jpeg") {
  try {
    // ===== 入力チェック =====
    if (!buffer) {
      console.error("❌ buffer が空");
      return null;
    }

    if (!fileName) {
      fileName = "unknown.jpg";
    }

    // ===== ユニークファイル名生成 =====
    // Date.now() + ランダム値で衝突防止
    const safeName =
      Date.now() +
      "_" +
      crypto.randomBytes(6).toString("hex") +
      "_" +
      fileName;

    // ===== Storage上のファイル参照取得 =====
    const file = bucket.file(safeName);

    // ===== アップロード =====
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
      resumable: false, // 小さいファイルならfalseが安定
    });

    // ===== 公開設定 =====
    // 誰でもアクセス可能になる（用途に応じて変更OK）
    await file.makePublic();

    // ===== 公開URL生成 =====
    const url = `https://storage.googleapis.com/${bucket.name}/${safeName}`;

    console.log("✅ Firebase upload success:", url);

    return url;

  } catch (err) {
    console.error("🔥 Firebase upload error:", err);
    return null;
  }
}

module.exports = { uploadToFirebase };
