// utils/firebaseAdmin.js

//const admin = require("firebase-admin");

// ===== Firebase Admin 初期化（1回だけ）=====
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

// ===== Storageバケット取得 =====
//const bucket = admin.storage().bucket();

module.exports = { bucket };
