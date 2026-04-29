// utils/receiptTagger.js


const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// レシート専用タグ分類
async function generateReceiptTags(text) {
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
以下の中から必ず1つ選びなさい：
食費 / 交通費 / 燃料費 / 資材費 / 農薬 / 肥料 / 機械 / 消耗品 / その他経費
1語のみ返す
`,
        },
        {
          role: "user",
          content: text || "",
        },
      ],
    });

    const subTag = res?.choices?.[0]?.message?.content?.trim();

    return ["経費", subTag || "その他経費"];

  } catch (err) {
    console.error("receipt tag error:", err);
    return ["経費", "その他経費"];
  }
}

module.exports = { generateReceiptTags };
