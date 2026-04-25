// utils/schedule.js

/**
 * 予定テキストから日付・時間・タイトルを抽出する
 * @param {string} text
 * @returns {Object|null} { date, time, title }
 */
function parseSchedule(text) {
  const now = new Date();

  let date = null;
  let time = null;
  let title = text;

  // ---------------------------
  // 📅 日付解析
  // ---------------------------

  // 明日
  if (text.includes("明日")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    date = formatDate(d);
  }

  // 来週
  else if (text.includes("来週")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    date = formatDate(d);
  }

  // 5月1日など
  else {
    const match = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const year = now.getFullYear();
      const month = match[1].padStart(2, "0");
      const day = match[2].padStart(2, "0");
      date = `${year}-${month}-${day}`;
    }
  }

  // ---------------------------
  // ⏰ 時間解析（19時 / 19:30）
  // ---------------------------

  const timeMatch = text.match(/(\d{1,2})[:時](\d{2})?/);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, "0");
    const minute = (timeMatch[2] || "00").padStart(2, "0");
    time = `${hour}:${minute}`;
  }

  // ---------------------------
  // 🧠 タイトル抽出（ノイズ除去）
  // ---------------------------

  title = title
    .replace(/明日|来週/g, "")
    .replace(/\d{1,2}月\d{1,2}日/g, "")
    .replace(/\d{1,2}[:時]\d{0,2}?/g, "")
    .replace(/\s+/g, "")
    .trim();

  // ---------------------------
  // 🎯 タイトル補正（意味付け）
  // ---------------------------

  if (!title) {
    if (text.includes("バイト")) title = "バイト";
    else if (text.includes("会議")) title = "会議";
    else if (text.includes("予定")) title = "予定";
    else title = "予定";
  }

  // ---------------------------
  // 📦 結果
  // ---------------------------

  return {
    date,
    time,
    title,
  };
}

// ---------------------------
// 🧰 util
// ---------------------------

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

module.exports = {
  parseSchedule,
};
