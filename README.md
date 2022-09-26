# faerlina-queue-bot

This is a very simple discord bot which reads from the community-created WOTLK Faerlina Server Queue API:
https://anou4whqbrwdpzlhjcceflrhum0shway.lambda-url.us-east-1.on.aws/v1/queue

NOTE: If this API is down, stale, stops working - the bot is useless. Don't blame the bot if it posts inaccurate/old data - everything comes from the API above.

# Install the bot:

https://discord.com/api/oauth2/authorize?client_id=823637927870464056&permissions=67202048&scope=bot

> If you want to add this to your own server, STRONGLY recommend registering your own app and self-hosting. If you install using the above url, no guarantee is made about functionality, availability, or anything else. This bot was built as an in-house project for our guild.
>
> The functionality of this bot is subject to change/break at any moment without warning.

# Run the bot yourself

1. Run `npm install`

2. Register an app and bot: https://discord.com/developers/applications - save the bot token

3. Add the bot to your server by navigating to Oauth2 -> URL Generator. The bot needs: `Change Nickname`, `Read Messages/View Channels`, `Send Messages`, `Manage Messages`, `Embed Links`, and `Read Message History` - after checking these boxes, copy and save the install url, visit the URL and trust/add the bot to your server.

4. Create a `.env` file with contents:

```
# bot token:
DISCORD_TOKEN=
# api to retrieve queue data from
API_URL=https://anou4whqbrwdpzlhjcceflrhum0shway.lambda-url.us-east-1.on.aws/v1/queue
# ID of the server to send messages/update channel (enable discord developer mode to add 'copy id' to right-click menus)
GUILD_ID=
# Channel ID to send messages to
OUTPUT_CHANNEL_ID=
# if set to `1`, the timer will not post anything unless it has fresh data from the API.
# if set to `0`, it will post messages like 'unknown queue time'
IGNORE_OLD_MISSING_DATA=1
```

5. Start the bot - `npm start`

> While the bot is running, it will poll the API every so often and post an update to the configured guild and channel. The bot also responds to `!queue` and will immediately poll the API and post the current queue data.
>
> During the hours of 4pm to 1am, the bot will run every 20 mins. Outside this window, it will run every hour.

# Contribute

Feel free to fork, and make this your own. You can open a PR if you have something to add back to the main repo.
