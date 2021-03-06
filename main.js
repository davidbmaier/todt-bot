const Discord = require(`discord.js`);
const client = new Discord.Client({ partials: [`MESSAGE`, `CHANNEL`, `REACTION`] });
const cron = require(`cron`).CronJob;
require(`dotenv`).config();

const discordAPI = require(`./src/discordAPI`);
const commands = require(`./src/commands`);
const utils = require(`./src/utils`);

const discordToken = process.env.DISCORD_TOKEN;
const deployMode = process.env.DEPLOY_MODE;

// send out COTD pings every day at 18:50:00
new cron(
  `00 50 18 * * *`,
  async () => {
    await discordAPI.sendCOTDPings(client);
  },
  null,
  true,
  `Europe/Paris`
);

// display the current totd every day at 19:00:15
new cron(
  `15 00 19 * * *`,
  async () => {
    await discordAPI.distributeTOTDMessages(client);
  },
  null,
  true,
  `Europe/Paris`
);

// refresh bingo every week on Monday at 19:00:45 (just after the TOTD because that counts yesterday's bingo votes)
new cron(
  `45 00 19 * * 1`,
  async () => {
    await discordAPI.getBingoMessage(true);
  },
  null,
  true,
  `Europe/Paris`
);

client.on(`ready`, async () => {
  console.log(`Ready as ${client.user.tag}!`);
  
  // in production, refresh TOTD to make sure there is a thumbnail in the images for cached messages
  if (deployMode === `prod`) {
    await discordAPI.getTOTDMessage(true);
  }
});

client.on(`message`, async (msg) => {
  if (msg.guild && msg.content.startsWith(utils.addDevPrefix(`!totd`))) {
    console.log(`Received message: ${msg.content} (#${msg.channel.name} in ${msg.guild.name})`);

    let matchedCommand;
    for (let i = 0; i < commands.length; i++) {
      if (msg.content.startsWith(commands[i].command)) {
        matchedCommand = commands[i];
        break;
      }
    }

    if (matchedCommand) {
      await matchedCommand.action(msg, client);
    } else {
      try {
        await msg.channel.send(
          `I don't know what to do, you might want to check \`${utils.addDevPrefix(`!totd help`)}\` to see what I can understand.`
        );
      } catch (error) {
        if (error.message === `Missing Permissions`) {
          console.error(`Unable to send error message to channel #${msg.channel.name} in ${msg.guild.name}, no permissions`);
        } else {
          console.error(`Unexpected error while sending error message to channel #${msg.channel.name} in ${msg.guild.name}`);
          console.error(error.message);
        }
      }
      
    }
  }
});

const handleReaction = async (reaction, user, add) => {
  if (reaction.partial) {
		// if reaction is partial (not cached), try to fetch it fully
		try {
			await reaction.fetch();
		} catch (error) {
			console.error(`Something went wrong when fetching the full reaction: `, error);
			return;
		}
	}

  if (
    reaction.message.author && (reaction.message.author.id === client.user.id) // check the message was sent by the bot
    && user.id !== client.user.id // check the reaction was not sent by the bot
  ) {
    discordAPI.updateTOTDReactionCount(reaction, add);
  }
};

client.on(`messageReactionAdd`, (reaction, user) => {
  handleReaction(reaction, user, true);
});

client.on(`messageReactionRemove`, async (reaction, user) => {
  handleReaction(reaction, user, false);
});

client.on(`guildCreate`, (guild) => {
  console.log(`Joined new server: ${guild.name}`);
});

client.on(`guildDelete`, (guild) => {
  console.log(`Left server: ${guild.name}`);
});

client.login(discordToken);
