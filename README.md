setup

1. install node 20 or newer
2. npm install
3. dev portal, bot tab: turn on server members intent and message content intent
4. oauth2, url generator, scopes bot + applications.commands, permissions send messages + embed links
5. open the invite link, add it to your server
6. put your user id in config.js ownerId, put your server id in syncGuildId
7. node index.js

usage

!dm hello   -> dms everyone in the server
reply to a message with !dm hello   -> same but the dm carries a link to that message
/raid-star hello   -> same as !dm
/wl-add @user or /wl-add 123456789   -> lets them use the bot
/wl-remove @user or /wl-remove 123456789   -> removes them

generating tokens

node gen.js 50   -> makes 50 bot tokens into tokens.json
node gen.js 100  -> tops up to 100, needs a second account token past the 50 limit

notes

dms go out as plain text with the person mentioned, not embeds.
appendLink in config.js gets stuck on the end of every dm.
only whitelisted people can use anything, admins included. you're always allowed.
whitelist is saved in whitelist.json.
if a token gets flagged the bot swaps to the next one in the list.
dmDelay is 0, everything sends at once.