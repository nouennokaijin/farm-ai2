// utils/firebaseAdmin.js

// ===== Firebase Admin SDK 読み込み =====
const admin = require("firebase-admin");

// ===== 環境変数からサービスアカウント取得 =====
// ※ JSON文字列として.envに入れてる前提
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// ===== 初期化（多重初期化防止）=====
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    // 🔽ここ重要（Storage使うなら必須）
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

// ===== バケット取得 =====
const bucket = admin.storage().bucket();

// ===== export =====
module.exports = { admin, bucket };
