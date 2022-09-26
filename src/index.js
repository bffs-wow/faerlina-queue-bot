require("dotenv").config();
const { last } = require("lodash");
const { getCurrentQueue } = require("./api.service");
const { wait } = require("./util");
const { log, logError } = require("./logger");
const { differenceInMinutes, format, formatDistance } = require("date-fns");
const Eris = require("eris");
const { getCacheEntry, saveCache, getCachedDate } = require("./cache");

(async () => {
  // Intents are the objects we want to interact with: i.e. servers (guilds) and messages (guildMessages)
  const bot = new Eris(process.env.DISCORD_TOKEN, {
    intents: ["guilds", "guildMessages"],
  });
  bot.on("ready", () => {
    // When the bot is ready
    log("Ready!"); // Log "Ready!"
  });
  bot.on("error", (err) => {
    logError(err);
  });

  // Handle commands
  bot.on("messageCreate", async (msg) => {
    // If the message is "!queue"
    if (msg.content === "!queue") {
      const { guild } = await ensureConnection(bot);
      await getDataAndNotify(bot, msg.channel.id, guild, true);
    }
  });

  // Run forever
  while (true) {
    try {
      // Connect to discord
      const { guild, output_channel } = await ensureConnection(bot);
      log(`Polling API...`);
      const res = await getDataAndNotify(bot, output_channel.id, guild);
      if (res == "NO_DATA" || res == "OLD_DATA") {
        // While the bot is down/data is old, check every 10 minutes
        await wait(60 * 10 * 1000);
        continue;
      }
      // Every 20 mins during primetime (4pm - 1am)
      if (new Date().getHours() > 15 || new Date().getHours() < 1) {
        // pause 20 mins
        await wait(60 * 20 * 1000);
      }
      // Every hour outside
      else {
        // pause 60 mins
        await wait(60 * 60 * 1000);
      }
    } catch (e) {
      logError(`Error occurred processing: `, e);
    }
  }
})();

async function ensureConnection(bot) {
  let guild;
  let output_channel;
  let bot_member;
  while (!guild && !output_channel) {
    bot.connect();
    await wait(2000);
    log(`Waiting to connect...`);

    guild = bot.guilds.get(process.env.GUILD_ID);
    if (guild) {
      output_channel = guild.channels.get(process.env.OUTPUT_CHANNEL_ID);
      bot_member = guild.members.get(bot.user.id);
    }

    if (guild && output_channel && bot_member) {
      log(`Ready! Connected as ${bot.user.username}`);
    }
  }
  return { guild, output_channel, bot_member };
}

let lastBadDataPost = getCachedDate("lastBadDataPost");
let lastPost = getCachedDate("lastPost");
/**
 * Handle !queue command
 */
async function getDataAndNotify(bot, channelId, guild, forceImmediate) {
  // Gather the queue API data
  const queueData = await getCurrentQueue();
  if (!Array.isArray(queueData)) {
    // If the API is down, notify the channel every few hours
    if (
      forceImmediate ||
      !lastBadDataPost ||
      differenceInMinutes(new Date(), lastBadDataPost) > 120
    ) {
      lastBadDataPost = new Date();
      saveCache("lastBadDataPost", lastBadDataPost);
      await bot.createMessage(channelId, {
        embed: {
          color: 0xff0000,
          title: `Faerlina Queue: Unknown`,
          description: ``,
          footer: {
            text: "No data was received from the API. It may be down.",
          },
        },
      });
    }
    log("No data was received from the API. It may be down.");
    return "NO_DATA";
  }
  // Gather the latest entry
  const latest = last(queueData);

  // If the API has not reported data in over 30 minutes, we aren't confident in the data.
  const minutesAgo = differenceInMinutes(new Date(), latest.date);
  if (minutesAgo > 30) {
    // If the data is old, notify the channel every few hours
    if (
      forceImmediate ||
      !lastBadDataPost ||
      differenceInMinutes(new Date(), lastBadDataPost) > 120
    ) {
      lastBadDataPost = new Date();
      saveCache("lastBadDataPost", lastBadDataPost);
      await guild.editNickname(`Queue: Unknown`);
      await bot.createMessage(channelId, {
        embed: {
          color: 0x3498db,
          title: `Faerlina Queue: Unknown`,
          description: `Updated @ ${format(
            latest.date,
            "Pp"
          )} (${formatDistance(latest.date, new Date(), {
            addSuffix: true,
          })})`,
          footer: { text: "The queue API does not have any recent data." },
        },
      });
    }
    log("The queue API does not have any recent data.");
    return "OLD_DATA";
  }
  // Only post a maximum of every 10 minutes, no matter what - account for app restarts, etc
  if (
    // ... unless the 'forceImmediate' flag is set
    forceImmediate ||
    !lastPost ||
    differenceInMinutes(new Date(), lastPost) > 10
  ) {
    lastPost = new Date();
    saveCache("lastPost", lastPost);
    // We have fresh data: update our nickname and post in the channel
    await guild.editNickname(`Queue: ${latest.position}`);
    const relativeTime = formatDistance(latest.date, new Date(), {
      addSuffix: true,
    });
    if (latest.position == 0) {
      await bot.createMessage(channelId, {
        embed: {
          title: `Faerlina Queue: None!`,
          description: `Updated @ ${format(
            latest.date,
            "Pp"
          )} (${relativeTime})`,
          color: 8311585,
        },
      });
    } else {
      await bot.createMessage(channelId, {
        embed: {
          title: `Faerlina Queue: ${latest.position}`,
          description: `Est. ${latest.time} mins - Updated @ ${format(
            latest.date,
            "Pp"
          )} (${relativeTime})`,
          color: 8311585,
        },
      });
    }
  }
  log(`Current Queue: ${latest.position}`);
  return "OK";
}
