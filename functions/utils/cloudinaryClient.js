// =====================================
// Cloudinary 初期化モジュール
// =====================================

const cloudinary = require("cloudinary").v2;

// =====================================
// 環境変数から設定
// =====================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =====================================
// export（どこでも使えるようにする）
// =====================================
module.exports = { cloudinary };
