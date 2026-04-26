async function handleChat(event) {
  const replyToken = event.replyToken;
  const text = event.message.text;

  if (!replyToken) {
    console.log("replyToken missing");
    return;
  }

  await client.replyMessage(replyToken, {
    type: "text",
    text: `🟢普通チャットとして受け取ったよ\n\n${text}`
  });
}

module.exports = { handleChat };
