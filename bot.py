import asyncio
import json
import os

import discord
from discord import app_commands
from discord.ext import commands

import config

wl_file = "whitelist.json"
raid_running = False
need_rotate = False


def load_wl():
    if not os.path.exists(wl_file):
        return []
    with open(wl_file, "r") as f:
        return json.load(f)


def save_wl(data):
    with open(wl_file, "w") as f:
        json.dump(data, f, indent=2)


whitelist = load_wl()


def allowed(user_id):
    return user_id == config.owner_id or user_id in whitelist


def parse_id(raw):
    digits = "".join(c for c in raw if c.isdigit())
    return int(digits) if digits else None


def make_embed(author, guild, text, reply_link):
    embed = discord.Embed(description=text, color=0x2b2d31)
    embed.set_author(name=author.name, icon_url=author.display_avatar.url)
    embed.set_footer(text=guild.name)
    if reply_link:
        embed.add_field(name="replying to", value=reply_link, inline=False)
    return embed


async def run_raid(bot, guild, author, text, reply_link, edit):
    global raid_running, need_rotate
    raid_running = True
    embed = make_embed(author, guild, text, reply_link)
    members = [m for m in guild.members if not m.bot]
    total = len(members)
    sent = 0
    failed = 0

    try:
        for i, member in enumerate(members, 1):
            try:
                await member.send(embed=embed)
                sent += 1
            except discord.HTTPException as e:
                failed += 1
                if e.status == 401:
                    need_rotate = True
                    await edit("token got killed, switching to the next one")
                    await bot.close()
                    return
            except Exception:
                failed += 1

            if i % 10 == 0 or i == total:
                await edit(f"{i}/{total} | sent {sent} | failed {failed}")

            await asyncio.sleep(config.dm_delay)
    finally:
        raid_running = False

    await edit(f"done. sent {sent}, failed {failed}, total {total}")


def build_bot():
    intents = discord.Intents.default()
    intents.members = True
    intents.message_content = True

    bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

    @bot.event
    async def on_ready():
        print(f"logged in as {bot.user}")
        try:
            await bot.tree.sync()
            print("slash commands synced")
        except Exception as e:
            print("sync failed:", e)

    @bot.command(name="dm")
    async def dm(ctx, *, text: str = None):
        if ctx.guild is None:
            return await ctx.reply("use this in a server", mention_author=False)

        if not allowed(ctx.author.id):
            return await ctx.reply("you are not whitelisted", mention_author=False)

        if raid_running:
            return await ctx.reply("a raid is already running", mention_author=False)

        if text is None:
            return await ctx.reply("usage: !dm <message>", mention_author=False)

        reply_link = None
        ref = ctx.message.reference
        if ref:
            try:
                replied = ref.cached_message or await ctx.channel.fetch_message(ref.message_id)
                reply_link = replied.jump_url
            except Exception:
                reply_link = f"https://discord.com/channels/{ctx.guild.id}/{ctx.channel.id}/{ref.message_id}"

        status = await ctx.reply("starting...", mention_author=False)

        async def edit(t):
            await status.edit(content=t)

        asyncio.create_task(run_raid(ctx.bot, ctx.guild, ctx.author, text, reply_link, edit))

    @bot.tree.command(name="raid-star", description="dm everyone in the server")
    @app_commands.describe(text="what to send")
    async def raid_star(interaction: discord.Interaction, text: str):
        if not allowed(interaction.user.id):
            return await interaction.response.send_message("you are not whitelisted", ephemeral=True)

        if raid_running:
            return await interaction.response.send_message("a raid is already running", ephemeral=True)

        await interaction.response.defer()
        status = await interaction.followup.send("starting...")

        async def edit(t):
            await status.edit(content=t)

        asyncio.create_task(run_raid(interaction.client, interaction.guild, interaction.user, text, None, edit))

    @bot.tree.command(name="wl-add", description="whitelist someone")
    @app_commands.describe(user="mention or user id")
    async def wl_add(interaction: discord.Interaction, user: str):
        if not allowed(interaction.user.id):
            return await interaction.response.send_message("you are not whitelisted", ephemeral=True)

        uid = parse_id(user)
        if uid is None:
            return await interaction.response.send_message("invalid user", ephemeral=True)

        if uid in whitelist:
            return await interaction.response.send_message(f"{uid} is already whitelisted", ephemeral=True)

        whitelist.append(uid)
        save_wl(whitelist)
        await interaction.response.send_message(f"added {uid}", ephemeral=True)

    @bot.tree.command(name="wl-remove", description="remove someone from the whitelist")
    @app_commands.describe(user="mention or user id")
    async def wl_remove(interaction: discord.Interaction, user: str):
        if not allowed(interaction.user.id):
            return await interaction.response.send_message("you are not whitelisted", ephemeral=True)

        uid = parse_id(user)
        if uid is None:
            return await interaction.response.send_message("invalid user", ephemeral=True)

        if uid == config.owner_id:
            return await interaction.response.send_message("owner can't be removed", ephemeral=True)

        if uid not in whitelist:
            return await interaction.response.send_message(f"{uid} isn't whitelisted", ephemeral=True)

        whitelist.remove(uid)
        save_wl(whitelist)
        await interaction.response.send_message(f"removed {uid}", ephemeral=True)

    return bot


async def main():
    global need_rotate
    index = 0

    while True:
        token = config.tokens[index % len(config.tokens)]
        bot = build_bot()

        try:
            await bot.start(token)
        except discord.LoginFailure:
            print("that token is dead, trying the next one")
            index += 1
            await asyncio.sleep(2)
            continue
        except discord.PrivilegedIntentsRequired:
            print("turn on server members + message content intents in the dev portal")
            return
        except Exception as e:
            print("crashed:", e)
            index += 1
            await asyncio.sleep(5)
            continue

        if need_rotate:
            need_rotate = False
            print("rotating token")
            index += 1
            continue

        return


asyncio.run(main())