const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");

const config = require("./config");

const wlFile = path.join(config.dataDir, "whitelist.json");
fs.mkdirSync(config.dataDir, { recursive: true });

let whitelist = [];
if (fs.existsSync(wlFile)) {
  try {
    whitelist = JSON.parse(fs.readFileSync(wlFile, "utf8"));
  } catch {
    whitelist = [];
  }
}

function saveWl() {
  fs.writeFileSync(wlFile, JSON.stringify(whitelist, null, 2));
}

function allowed(id) {
  return id === config.ownerId || whitelist.includes(id);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let raidRunning = false;
let needRotate = false;

function makeEmbed(author, guild, text, replyLink) {
  const embed = new EmbedBuilder()
    .setDescription(text)
    .setColor(0x2b2d31)
    .setAuthor({ name: author.username, iconURL: author.displayAvatarURL() })
    .setFooter({ text: guild.name });

  if (replyLink) embed.addFields({ name: "replying to", value: replyLink });

  return embed;
}

async function runRaid(client, guild, author, text, replyLink, edit) {
  raidRunning = true;
  const embed = makeEmbed(author, guild, text, replyLink);

  let members;
  try {
    members = await guild.members.fetch();
  } catch {
    raidRunning = false;
    return edit("couldn't fetch the member list");
  }

  const list = members.filter((m) => !m.user.bot).map((m) => m);
  const total = list.length;
  let sent = 0;
  let failed = 0;

  try {
    for (let i = 0; i < list.length; i++) {
      try {
        await list[i].send({ embeds: [embed] });
        sent++;
      } catch (e) {
        failed++;
        if (e.status === 401) {
          needRotate = true;
          await edit("token got killed, switching to the next one");
          client.destroy();
          client.stop();
          return;
        }
      }

      const done = i + 1;
      if (done % 10 === 0 || done === total) {
        await edit(`${done}/${total} | sent ${sent} | failed ${failed}`);
      }

      await sleep(config.dmDelay);
    }
  } finally {
    raidRunning = false;
  }

  await edit(`done. sent ${sent}, failed ${failed}, total ${total}`);
}

const commands = [
  new SlashCommandBuilder()
    .setName("raid-star")
    .setDescription("dm everyone in the server")
    .addStringOption((o) => o.setName("text").setDescription("what to send").setRequired(true)),
  new SlashCommandBuilder()
    .setName("wl-add")
    .setDescription("whitelist someone")
    .addUserOption((o) => o.setName("user").setDescription("mention or user id").setRequired(true)),
  new SlashCommandBuilder()
    .setName("wl-remove")
    .setDescription("remove someone from the whitelist")
    .addUserOption((o) => o.setName("user").setDescription("mention or user id").setRequired(true)),
].map((c) => c.toJSON());

function buildClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once("ready", async () => {
    console.log(`logged in as ${client.user.tag}`);
    try {
      await client.application.commands.set(commands);
      console.log("slash commands synced");
    } catch (e) {
      console.log("sync failed:", e.message);
    }
  });

  client.on("error", (e) => console.log("error:", e.message));

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith("!")) return;

    const args = message.content.slice(1).trim().split(/\s+/);
    const name = args.shift().toLowerCase();
    if (name !== "dm") return;

    const noPing = { allowedMentions: { repliedUser: false } };
    const text = args.join(" ");

    if (!allowed(message.author.id)) return message.reply({ content: "you are not whitelisted", ...noPing });
    if (raidRunning) return message.reply({ content: "a raid is already running", ...noPing });
    if (!text) return message.reply({ content: "usage: !dm <message>", ...noPing });

    let replyLink = null;
    if (message.reference) {
      replyLink = `https://discord.com/channels/${message.guild.id}/${message.reference.channelId}/${message.reference.messageId}`;
    }

    const status = await message.reply({ content: "starting...", ...noPing });
    const edit = (t) => status.edit(t).catch(() => {});

    runRaid(client, message.guild, message.author, text, replyLink, edit);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const no = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
    const cmd = interaction.commandName;

    if (cmd === "raid-star") {
      if (!allowed(interaction.user.id)) return no("you are not whitelisted");
      if (raidRunning) return no("a raid is already running");

      const text = interaction.options.getString("text");
      await interaction.reply("starting...");
      const status = await interaction.fetchReply();
      const edit = (t) => status.edit(t).catch(() => {});

      runRaid(interaction.client, interaction.guild, interaction.user, text, null, edit);
      return;
    }

    if (cmd === "wl-add") {
      if (!allowed(interaction.user.id)) return no("you are not whitelisted");

      const user = interaction.options.getUser("user");
      if (whitelist.includes(user.id)) return no(`${user.id} is already whitelisted`);

      whitelist.push(user.id);
      saveWl();
      return no(`added ${user.id}`);
    }

    if (cmd === "wl-remove") {
      if (!allowed(interaction.user.id)) return no("you are not whitelisted");

      const user = interaction.options.getUser("user");
      if (user.id === config.ownerId) return no("owner can't be removed");
      if (!whitelist.includes(user.id)) return no(`${user.id} isn't whitelisted`);

      whitelist = whitelist.filter((id) => id !== user.id);
      saveWl();
      return no(`removed ${user.id}`);
    }
  });

  return client;
}

async function main() {
  let index = 0;

  while (true) {
    if (index >= config.tokens.length * 2) {
      console.log("every token failed, waiting a minute");
      await sleep(60000);
      index = 0;
    }

    const token = config.tokens[index % config.tokens.length];
    const client = buildClient();

    try {
      await client.login(token);
    } catch (e) {
      console.log("that token is dead, trying the next one");
      index++;
      await sleep(2000);
      continue;
    }

    await new Promise((resolve) => {
      client.stop = resolve;
      client.on("shardDisconnect", (event) => {
        if (event.code === 4004) needRotate = true;
        resolve();
      });
    });

    if (needRotate) {
      needRotate = false;
      index++;
      console.log("rotating token");
    }

    await sleep(2000);
  }
}

main();