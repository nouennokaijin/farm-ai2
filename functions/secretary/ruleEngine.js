// secretary/ruleEngine.js
// 2026/05/04
// 🧠 ルールベース判定
// ・キーワード一致で即判定
// ・画像は60秒キーワード待機
// ・一致しない場合は "0" を返す（AIへフォールバック）

// ================================
// ⏳ 待機管理
// ================================
const waitMap = new Map();

// ================================
// 🧩 キーワード定義（AIと統一）
// ================================
const rules = [
  {
    type: "post",
    keywords: ["投稿", "メモ", "日記", "記録", "農業", "畑", "作業", "収穫", "プログラム", "コード", "開発"]
  },
  {
    type: "receipt",
    keywords: ["レシート", "領収書", "支出", "購入", "円", "¥", "金額"]
  },
  {
    type: "schedule",
    keywords: ["予定", "スケジュール", "予約", "会議", "打ち合わせ", "月", "日", "時"]
  },
  {
    type: "ocr",
    keywords: ["ocr", "読み取り", "文字起こし", "テキスト化", "読んで"]
  }
];

// ================================
// 🔍 キーワード判定
// ================================
function matchKeyword(text = "") {
  const lower = text.toLowerCase();

  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.type;
    }
  }

  return "0";
}

// ================================
// 🚀 メイン処理
// ================================
async function ruleEngine(event) {
  const userId = event.source?.userId;
  const type = event.message?.type;

  // テキスト
  if (type === "text") {
    const text = event.message.text || "";

    if (waitMap.has(userId)) {
      const resolve = waitMap.get(userId);
      waitMap.delete(userId);
      return resolve(matchKeyword(text));
    }

    return matchKeyword(text);
  }

  // 画像
  if (type === "image") {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        waitMap.delete(userId);
        resolve("0");
      }, 60000);

      waitMap.set(userId, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
    });
  }

  return "0";
}

// ================================
// 📤 エクスポート
// ================================
module.exports = { ruleEngine };
