const path = require("path");

// ========================================
// 大図書館
// ========================================

const LIBRARY_PATH = "/storage/emulated/0/大図書館";

// ========================================
// フォルダ
// ========================================

// 自省録の保存先
const DIARY_PATH = path.join(
  LIBRARY_PATH,
  "書庫",
  "自省録"
);

// 記憶の保存先
const MEMORY_PATH = path.join(
  LIBRARY_PATH,
  "記憶"
);

// 書庫の保存先
const ARCHIVE_PATH = path.join(
  LIBRARY_PATH,
  "書庫"
);

// 文書の保存先
const DOCUMENT_PATH = path.join(
  ARCHIVE_PATH,
  "文書"
);

// 画像の保存先
const IMAGE_PATH = path.join(
  LIBRARY_PATH,
  "画像"
);

// ========================================
// 小説
// ========================================

const NOVEL_PATH = path.join(
  ARCHIVE_PATH,
  "小説"
);

// オーバーロード
const OVERLORD_PATH = path.join(
  NOVEL_PATH,
  "オーバーロード"
);

// 銀河英雄伝説
const GINEIDEN_PATH = path.join(
  NOVEL_PATH,
  "銀河英雄伝説"
);

// ========================================
// Database
// ========================================

const DOCUMENT_DB = path.join(
  __dirname,
  "../library/document/document.db"
);

// ========================================
// Export
// ========================================

module.exports = {
  LIBRARY_PATH,
  DIARY_PATH,
  MEMORY_PATH,
  ARCHIVE_PATH,
  DOCUMENT_PATH,
  IMAGE_PATH,
  NOVEL_PATH,
  OVERLORD_PATH,
  GINEIDEN_PATH,
  DOCUMENT_DB,
};
