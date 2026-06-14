// ========================================
// FILE: src/index.discord.js
// PURPOSE: Discordシステム起動（複数BOT対応版）
// DATE: 2026/05/23
// AUTHOR: OKIURA KAZUO
// ========================================

// ========================================
// 環境変数読み込み
// ========================================

require("dotenv").config();

// ========================================
// Discord.js
// ========================================

const { Client, GatewayIntentBits } = require("discord.js");

// ========================================
// Dispatcher
// ========================================

const dispatcher = require("./core/dispatcher");

// ========================================
// Persona Loader
// ========================================

const personas = {
albedo: require("./personas/albedo"),
demiurge: require("./personas/demiurge"),
shalltear: require("./personas/shalltear"),
};

// ========================================
// Discord Client Factory
// BOTごとにクライアント生成
// ========================================

function createBotClient(botName, token, persona) {

// ========================================
// クライアント生成
// ========================================

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
],
});

// ========================================
// 起動ログ
// ========================================

client.once("clientReady", () => {

console.log("================================");
console.log(`${botName} 起動完了`);
console.log(`ログイン: ${client.user.tag}`);
console.log(`人格: ${persona.name}`);
console.log("================================");

});

// ========================================
// メッセージ受信
// ========================================

client.on("messageCreate", async (message) => {

try {

// ========================================
// Bot無視
// ========================================

  if (message.author.bot) return;

// ========================================
// Dispatcherへ送信
// ========================================

  await dispatcher({
    text: message.content,
    persona,
    reply: message.reply.bind(message),
    channel: message.channel,

    // ========================================
    // FIX 2026-06-14
    // room_idへDiscord Channelオブジェクト全体が
    // 保存される不具合対策
    // channel.idを明示的に渡す
    // ========================================
    channelId: message.channel.id,

    author: message.author,
  });

} catch (err) {

  console.error(`${botName} Error:`, err);

  try {
    await message.reply("エラーが発生しました。");
  } catch {}

}

});

// ========================================
// Discordログイン
// ========================================

client.login(token);
}

// ========================================
// アルベドBOT起動
// ========================================

createBotClient(
"ALBEDO BOT",
process.env.DISCORD_TOKEN,
personas.albedo
);

// ========================================
// デミウルゴスBOT起動
// ========================================

createBotClient(
"DEMIURGE BOT",
process.env.DEMIURGE_DISCORD_TOKEN,
personas.demiurge
);

// ========================================
// シャルティア・ブラッドフォールン BOT起動
// コメント名を正式名称へ修正
// ========================================

createBotClient(
"SHALLTEAR BOT",
process.env.SHALLTEAR_DISCORD_TOKEN,
personas.shalltear
);
