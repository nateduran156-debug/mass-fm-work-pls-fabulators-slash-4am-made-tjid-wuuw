// put your bot tokens here. the bot uses the first one, and if discord
// kills/flags it the bot moves to the next one on its own. add a few.
module.exports = {
  tokens: [
    "paste_token_1",
    "paste_token_2",
    "paste_token_3",
  ],

  // your discord user id. you always have access and can never be removed.
  ownerId: "1456824205545967713",

  // where whitelist.json gets saved.
  dataDir: ".",

  // 10 second timeout between each dm so discord doesn't rate limit you.
  // it's in milliseconds now. lower it if you want it faster.
  dmDelay: 10000,
};