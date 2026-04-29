const { generateReceiptTags } = require("../utils/receiptTagger");
const { saveMsgToNotion } = require("../utils/saveMsgToNotion");

async function handleReceipt({ text, replyToken }) {
  const tags = await generateReceiptTags(text);

  await saveMsgToNotion({
    title: "レシート",
    content: text,
    tags,
  });
}

