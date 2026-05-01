// =====================================
// Cloudinary アップロード処理
// =====================================

const { cloudinary } = require("./cloudinaryClient");
const crypto = require("crypto");

// =====================================
// 画像アップロード関数
// =====================================
// buffer   : LINEなどから来た画像データ（Buffer）
// fileName : 元ファイル名（なくてもOK）
// folder   : Cloudinary内フォルダ名
// =====================================
async function uploadToCloudinary(
  buffer,
  fileName = "unknown.jpg",
  folder = "farm-ai"
) {
  try {
    // =====================================
    // 入力チェック
    // =====================================
    if (!buffer) {
      console.error("❌ buffer が空です");
      return null;
    }

    // =====================================
    // ユニークファイル名生成（衝突防止）
    // =====================================
    const uniqueName =
      Date.now() +
      "_" +
      crypto.randomBytes(6).toString("hex") +
      "_" +
      fileName;

    // =====================================
    // Buffer → Base64変換（Cloudinary用）
    // =====================================
    const base64 = buffer.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64}`;

    // =====================================
    // Cloudinaryへアップロード
    // =====================================
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,        // フォルダ分け
      public_id: uniqueName, // ファイル名
      resource_type: "image" // 画像として扱う
    });

    // =====================================
    // 成功ログ
    // =====================================
    console.log("✅ Cloudinary upload success:", result.secure_url);

    // =====================================
    // URL返却
    // =====================================
    return result.secure_url;

  } catch (err) {
    console.error("🔥 Cloudinary upload error:", err);
    return null;
  }
}

module.exports = { uploadToCloudinary };
