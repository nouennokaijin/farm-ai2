const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================
// レシート専用タグ分類AI
// =====================================
async function generateReceiptTags(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
あなたは経費仕訳AIです。

以下から必ず1つ選択してください：

食費 / 交通費 / 燃料費 / 資材費 / 農薬 / 肥料 / 機械 / 消耗品 / その他経費

ルール：
- 1語のみ
- 説明禁止
`,
        },
        {
          role: "user",
          content: text || "",
        },
      ],
    });

    const subTag = res?.choices?.[0]?.message?.content?.trim();

    // ================================
    // 固定タグ + 分類タグ
    // ================================
    return ["経費", subTag || "その他経費"];

  } catch (err) {
    console.error("receipt tag error:", err);
    return ["経費", "その他経費"];
  }
}

module.exports = { generateReceiptTags };
