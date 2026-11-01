setup

1. install node 20 or newer
2. npm install
3. dev portal, bot tab: turn on server members intent and message content intent
4. oauth2, url generator, scopes bot + applications.commands, permissions send messages + embed links
5. open the invite link, add it to your server
6. node index.js

usage

!dm hello   -> dms everyone in the server
reply to a message with !dm hello   -> same but the dm has a link to the message
/raid-star hello   -> same as !dm
/wl-add @user or /wl-add 123456789   -> lets them use the bot
/wl-remove @user or /wl-remove 123456789   -> removes them

notes

only whitelisted people can use anything, admins included. you're always allowed.
the whitelist is saved in whitelist.json.
if a token gets flagged the bot swaps to the next one in the list.
dmDelay is in config.js, it's milliseconds. 10000 is the 10 seconds you asked for.