const tmAPI = require(`./tmApi`);
const format = require(`./format`);
const redisAPI = require(`./redisApi`);

const getTOTDMessage = async () => {
  const credentials = await tmAPI.loginToTM();
  const totd = await tmAPI.getCurrentTOTD(credentials);
  return format.formatTOTDMessage(totd);
};

const getTOTDLeaderboardMessage = async () => {
  const credentials = await tmAPI.loginToTM();
  const totd = await tmAPI.getCurrentTOTD(credentials);
  const top = await tmAPI.getTOTDLeaderboard(credentials, totd.seasonUid, totd.mapUid);
  return format.formatLeaderboardMessage(totd, top);
};

const sendTOTDMessage = async (client, channel, message) => {
  console.log(`Sending current TOTD to #${channel.name} in ${channel.guild.name}`);

  const discordMessage = await channel.send(message);
  // add rating emojis
  const emojis = [
    client.emojis.resolve(`807983766239838208`),
    client.emojis.resolve(`807983738603962368`),
    client.emojis.resolve(`807983713698316308`),
    client.emojis.resolve(`807983669330706482`),
    client.emojis.resolve(`807983625001107497`),
    client.emojis.resolve(`807983052046598165`)
  ];
  emojis.forEach(async (emoji) => {
    await discordMessage.react(emoji);
  });
};

const sendTOTDLeaderboard = async (client, channel) => {
  console.log(`Sending current leaderboard to #${channel.name} in ${channel.guild.name}`);

  const discordMessage = await channel.send(`Fetching current leaderboard, give me a second...`);

  const leaderboardMessage = await getTOTDLeaderboardMessage();
  discordMessage.edit(leaderboardMessage);
};

const distributeTOTDMessages = async (client) => {
  console.log(`Broadcasting TOTD message to subscribed channels`);
  const message = await getTOTDMessage();

  const redisClient = await redisAPI.login();
  const configs = await redisAPI.getAllConfigs(redisClient);
  redisAPI.logout(redisClient);

  configs.forEach(async (config) => {
    try {
      const channel = await client.channels.fetch(config.channelID);
      sendTOTDMessage(client, channel, message);
    } catch (error) {
      if (error.message === `Missing Access`) {
        console.log(`Can't access server, bot was probably kicked.`);
      } else {
        console.error(error);
      }
    }
  });
};

const sendErrorMessage = (channel) => {
  channel.send(`Oops, something went wrong here - please talk to my dev and let him know that didn't work.`);
};

module.exports = {
  sendTOTDMessage,
  getTOTDMessage,
  sendErrorMessage,
  sendTOTDLeaderboard,
  distributeTOTDMessages
};
