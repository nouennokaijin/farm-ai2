// ========================================
// FILE: src/bots/discordBot.js
// PURPOSE: Discord Bot 管理
// DATE: 2026/05/20
// AUTHOR: OKIURA KAZUO
// ========================================

const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const dispatcher = require("../core/dispatcher");

const client = new Client({

  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {

  console.log(`✅ Login: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const result = await dispatcher({

    text: message.content,
    username: message.author.username,
    attachments: message.attachments
  });

  await message.reply(result.reply);
});

function start() {

  client.login(process.env.DISCORD_TOKEN);
}

module.exports = {
  start
};
