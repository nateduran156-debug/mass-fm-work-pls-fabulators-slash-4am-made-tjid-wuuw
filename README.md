setup

1. go to discord.com/developers/applications and make a new app
2. bot tab -> copy the token into config.py tokens list
3. bot tab -> turn on server members intent and message content intent
4. oauth2 -> url generator -> scopes bot + applications.commands, permissions send messages + embed links
5. open the invite link and add it to your server
6. put your own user id in config.py owner_id
7. pip install -r requirements.txt
8. python bot.py

usage

!dm hello   -> dms everyone in the server
reply to a message with !dm hello   -> same thing but the dm has a link to the message
/raid-star hello   -> same as !dm
/wl-add @user or /wl-add 123456789   -> lets them use the bot
/wl-remove @user or /wl-remove 123456789   -> removes them

notes

only whitelisted people can use anything, admins included. you're always allowed.
the whitelist is saved in whitelist.json.
if a token gets flagged the bot swaps to the next token in the list on its own.
dm delay is 10 seconds, change dm_delay in config.py if you want it faster.
slash commands can take up to an hour to show up the first time.