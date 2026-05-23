// utils/cloudinaryUpload.js
// 20265/2
// Okiura Kazuo

// =====================================
// Cloudinary アップロード処理
// =====================================

const { cloudinary } = require("./cloudinaryClient");
const crypto = require("crypto");

// =====================================
// アップロード関数
// =====================================
async function uploadToCloudinary(
  buffer,
  fileName = "unknown",
  folder = "farm-ai"
) {
  try {
    if (!buffer) {
      console.error("❌ buffer が空です");
      return null;
    }

    // =====================================
    // ユニーク名
    // =====================================
    const uniqueName =
      Date.now() +
      "_" +
      crypto.randomBytes(6).toString("hex") +
      "_" +
      fileName;

    console.log("🚀 uploading to Cloudinary:", uniqueName);

    // =====================================
    // ★ 修正：bufferそのままstreamアップロード（最強安定）
    // =====================================
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: uniqueName,
          resource_type: "auto", // ← 重要（画像・PDF全部OK）
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(buffer);
    });

    console.log("✅ Cloudinary upload success:", result.secure_url);

    return result.secure_url;

  } catch (err) {
    console.error("🔥 Cloudinary upload error:", err);
    return null;
  }
}

module.exports = { uploadToCloudinary };
