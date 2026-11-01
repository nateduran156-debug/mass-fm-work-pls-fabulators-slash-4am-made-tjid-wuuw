const fs = require("fs");

const manual = [
  "paste_token_1",
  "paste_token_2",
  "paste_token_3",
];

// gen.js writes tokens.json. if that file exists it wins over the list above.
function getTokens() {
  if (fs.existsSync("tokens.json")) {
    try {
      const made = JSON.parse(fs.readFileSync("tokens.json", "utf8"));
      const list = made.map((a) => a.token).filter(Boolean);
      if (list.length) return list;
    } catch {}
  }
  return manual;
}

module.exports = {
  manual,
  getTokens,

  // your account token. only gen.js uses it.
  userToken: "paste_account_token",

  // ms between app creations in gen.js. don't go under 2000.
  genDelay: 3000,

  // your discord user id. you always have access and can never be removed.
  ownerId: "1456824205545967713",

  // where whitelist.json gets saved.
  dataDir: ".",

  // your server id. makes slash commands show up instantly instead of
  // taking up to an hour. leave it empty to sync globally.
  syncGuildId: "",

  // stuck on the end of every dm. paste a channel link here, or an invite
  // like discord.gg/xxxx. leave it empty for nothing.
  appendLink: "",

  // 0 sends to everyone at once. raise it to stagger.
  dmDelay: 0,
};