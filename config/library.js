// ========================================
// 📁 config/library.js
// 📅 2026-08-03
// 🚀 ナザリック大図書館 共通設定
// ========================================

const path = require("path");

// ========================================
// 📚 大図書館ルート
// ========================================

const LIBRARY_PATH = "/storage/9C33-6BBD/大図書館";

// ========================================
// 📂 各フォルダ
// ========================================

const DIARY_PATH = path.join(LIBRARY_PATH, "自省録");
const MEMORY_PATH = path.join(LIBRARY_PATH, "記憶");

const ARCHIVE_PATH = path.join(LIBRARY_PATH, "書庫");
const DOCUMENT_PATH = path.join(ARCHIVE_PATH, "文書");

const IMAGE_PATH = path.join(LIBRARY_PATH, "画像");

// ========================================
// 🗄️ Database
// ========================================

const DOCUMENT_DB = path.join(__dirname, "../library/document/document.db");

// ========================================
// 📦 Export
// ========================================

module.exports = {
  LIBRARY_PATH,
  DIARY_PATH,
  MEMORY_PATH,
  ARCHIVE_PATH,
  DOCUMENT_PATH,
  IMAGE_PATH,
  DOCUMENT_DB,
};
