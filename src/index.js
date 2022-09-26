require("dotenv").config();
const { last } = require("lodash");
const { getCurrentQueue } = require("./api.service");
const { wait } = require("./util");
const { log, logError } = require("./logger");
const { differenceInMinutes, format, formatDistance } = require("date-fns");
const Eris = require("eris");
const { getCacheEntry, saveCache, getCachedDate } = require("./cache");

const { IGNORE_OLD_MISSING_DATA, DISCORD_TOKEN, GUILD_ID, OUTPUT_CHANNEL_ID } =
  process.env;

(async () => {
  // Intents are the objects we want to interact with: i.e. servers (guilds) and messages (guildMessages)
  const bot = new Eris(DISCORD_TOKEN, {
    intents: ["guilds", "guildMessages"],
  });
  bot.on("ready", () => {
    // When the bot is ready
    log("Ready!");
  });
  bot.on("error", (err) => {
    logError(err);
  });

  // Handle commands
  bot.on("messageCreate", async (msg) => {
    // If the message is "!queue"
    if (msg.content === "!queue") {
      log(`!queue command received ${JSON.stringify(msg)}`);
      const { guild } = await ensureConnection(
        bot,
        GUILD_ID,
        OUTPUT_CHANNEL_ID
      );
      const data = await getDataAndNotification(bot, msg.channel.id, guild);
      // Update bot nickname
      await guild.editNickname(`Queue: ${data.currentQueue}`);
      // Reply to the user
      await sendMessage(bot, msg.channel.id, data.message);
    }
  });

  // Run forever - tick every 10 mins
  const tick = 60 * 10 * 1000;
  let lastPost = getCachedDate("lastPost");
  while (true) {
    const lastPostMinutesAgo = differenceInMinutes(new Date(), lastPost);
    try {
      // Connect to discord
      const { guild, output_channel } = await ensureConnection(
        bot,
        GUILD_ID,
        OUTPUT_CHANNEL_ID
      );
      log(`Polling API...`);
      const data = await getDataAndNotification(bot, output_channel.id, guild);
      const sendAndCache = async () => {
        lastPost = new Date();
        saveCache("lastPost", lastPost);
        await sendMessage(bot, output_channel.id, data.message);
      };
      // Update bot nickname
      await guild.editNickname(`Queue: ${data.currentQueue}`);
      if (data.res == "NO_DATA" || data.res == "OLD_DATA") {
        // If setting to notify on old data is set, send the notice every 2 hours
        if (IGNORE_OLD_MISSING_DATA != 1 && lastPostMinutesAgo >= 120) {
          await sendAndCache();
        }
      } else {
        // Every 20 mins during primetime (4pm - 1am)
        if (new Date().getHours() > 15 || new Date().getHours() < 1) {
          if (lastPostMinutesAgo >= 20) {
            await sendAndCache();
          }
        }
        // Every hour outside
        else {
          if (lastPostMinutesAgo >= 60) {
            await sendAndCache();
          }
        }
      }
    } catch (e) {
      logError(`Error occurred processing: `, e);
    }
    // Sleep for the tick duration
    await wait(tick);
  }
})();

/**
 * Ensure the bot is connected, and retrieve the specified guild and channel.
 */
async function ensureConnection(bot, guildId, outputChannelId) {
  let guild;
  let output_channel;
  let bot_member;
  while (!guild && !output_channel) {
    bot.connect();
    await wait(2000);
    log(`Waiting to connect...`);

    guild = bot.guilds.get(guildId);
    if (guild) {
      output_channel = guild.channels.get(outputChannelId);
      bot_member = guild.members.get(bot.user.id);
    }

    if (guild && output_channel && bot_member) {
      log(`Connected as ${bot.user.username}`);
    }
  }
  return { guild, output_channel, bot_member };
}

/**
 * Handle !queue command
 */
async function getDataAndNotification(bot, guild) {
  // Gather the queue API data
  const queueData = await getCurrentQueue();
  // If what we received is not an array, assume the API is down
  if (!Array.isArray(queueData)) {
    log("No data was received from the API. It may be down.");
    return {
      res: "NO_DATA",
      message: {
        embed: {
          color: 0xff0000,
          title: `Faerlina Queue: Unknown`,
          description: ``,
          footer: {
            text: "No data was received from the API. It may be down.",
          },
        },
      },
      currentQueue: "Unknown",
    };
  }
  // Gather the latest entry
  const latest = last(queueData);

  // If the API has not reported data in over 30 minutes, we aren't confident in the data.
  const minutesAgo = differenceInMinutes(new Date(), latest.date);
  if (minutesAgo > 30) {
    log("The queue API does not have any recent data.");
    return {
      res: "OLD_DATA",
      message: {
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
      },
      currentQueue: "Unknown",
    };
  }
  // We have fresh queue data - create the message
  log(`Current Queue: ${latest.position}`);
  let message = {};
  if (latest.position == 0) {
    message = {
      embed: {
        title: `Faerlina Queue: None!`,
        description: `Updated @ ${format(latest.date, "Pp")} (${relativeTime})`,
        color: 8311585,
      },
    };
  } else {
    message = {
      embed: {
        title: `Faerlina Queue: ${latest.position}`,
        description: `Est. ${latest.time} mins - Updated @ ${format(
          latest.date,
          "Pp"
        )} (${relativeTime})`,
        color: 8311585,
      },
    };
  }

  return { res: "OK", message, currentQueue: latest.position };
}

async function sendMessage(bot, channelId, message) {
  return await bot.createMessage(channelId, message);
}
