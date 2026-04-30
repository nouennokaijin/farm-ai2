// utils/firebaseUpload.js

// ===== Firebase Adminからバケット取得 =====
// ※ firebase.js → firebaseAdmin.js にリネーム済み前提
const { bucket } = require("./firebaseAdmin");

const crypto = require("crypto");

// ===== Firebase Storageへアップロード =====
// buffer   : LINEから取得したバイナリ
// fileName : 元ファイル名
// mimeType : 画像 or ファイル種別
async function uploadToFirebase(buffer, fileName, mimeType = "image/jpeg") {
  try {
    // ===== ユニークファイル名生成 =====
    // 同名衝突防止 + 追跡性確保
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
      resumable: false, // 小さい画像ならOFFの方が安定
    });

    // =====================================================
    // ⚠️ 公開設定（ここは設計ポイント）
    // =====================================================
    // makePublic は「誰でもURLアクセス可能」になる
    // 個人ツールならOK / SaaSなら署名URL推奨

    await file.makePublic();

    // ===== 公開URL生成 =====
    // Google Storage標準形式
    const url = `https://storage.googleapis.com/${bucket.name}/${safeName}`;

    return url;

  } catch (err) {
    console.error("Firebase upload error:", err);
    return null;
  }
}

module.exports = { uploadToFirebase };
