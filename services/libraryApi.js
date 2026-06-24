// file: services/libraryApi.js
// created: 2026-06-24
// author: OKIURA KAZUO
// purpose: Webからlibrary操作を行うためのAPI中継レイヤー

const libraryService = require("./libraryService"); // library本体処理を呼び出す

// アイテム追加
async function addItem(data) {
  return await libraryService.addItem(data); // データをそのまま保存処理へ渡す
}

// アイテム一覧取得
async function getItems() {
  return await libraryService.getItems(); // 全件取得
}

// アイテム削除
async function deleteItem(id) {
  return await libraryService.deleteItem(id); // 指定IDを削除
}

// Web/API用にまとめて公開
module.exports = {
  addItem, // 追加処理
  getItems, // 取得処理
  deleteItem // 削除処理
};
