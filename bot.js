const tmi = require('tmi.js');
const fs = require('fs');

const Discord = require('discord.js');

const secrets = JSON.parse(fs.readFileSync('./secrets.json'));
const config = JSON.parse(fs.readFileSync('./config.json'));

let discordConnected = false;
let twitchConnected = false;

/* BEGIN Define config options */
// Get secret tokens
const oauth = secrets.twitch.oauthToken;
const token = secrets.discord.token;

// Discord config options
// Create the discord client
const discordClient = new Discord.Client();

// Twitch config options
const opts = config.twitch;
opts.identity.password = oauth;

// Create the twitch client with the options
const twitchClient = new tmi.client(opts);
/* END Define config options */


/* BEGIN Register Handlers */
// Register Twitch event handlers
twitchClient.on('connected', onTwitchConnectedHandler);
twitchClient.on('message', onTwitchMessageHandler);

// Register Discord event handlers
discordClient.on('ready', onDiscordReadyHandler);
discordClient.on('message', onDiscordMessageHandler);
/* END Register Handlers */


/* BEGIN Connections */
// Connect to Twitch:
twitchClient.connect();

// Connect to Discord:
discordClient.login( token ).catch( it => console.log('Invalid Discord token!') );
/* END Connections */


/* BEGIN event handlers */

/* BEGIN Connect handlers */
// Twitch connect handler
function onTwitchConnectedHandler (addr, port) {
	console.log(`* Twitch/IRC Connected to ${addr}:${port}`);
	twitchConnected = true;
}

// Discord connect handler
function onDiscordReadyHandler() {
	console.log('* Connected to Discord');
	discordConnected = true;
}
/* END Connect handlers */

/* BEGIN Message handlers */
// Twitch message handler
function onTwitchMessageHandler (target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	// Remove whitespace from chat message
	const message = msg.trim();

	if (!discordConnected) {
		console.error('* Twitch -> Discord\nCannot send message, not connected to Discord');
	}

	const authorName = context['display-name'];
	const fullMessage = `[${authorName}]: ${message}`;

	config.discord.connections.forEach(connection => 
		discordClient.channels.fetch(connection.channelId)
			.then(channel => sendDiscordMessage(channel, fullMessage))
			.catch(err => console.log(`Could not send message to connection "${connection.name}"\n${err}`)));
}

// Discord message handler
function onDiscordMessageHandler( message ) {
	if (message.author.bot) { return; }
	if (!twitchConnected) {
		console.error('* Discord -> Twitch\nCannot send message, not connected to Twitch');
	}
	const member = message.guild.member(message.author);
	const fullMessage = `[${member.displayName}]: ${message.content.trim()}`;
	config.twitch.channels.forEach(channel => sendTwitchMessage(channel, fullMessage));
}
/* END Message handlers */
/* END event handlers */


/* BEGIN Helper functions */
function sendTwitchMessage(channel, message) {
	twitchClient.say(`${channel}`, message);
	console.log(`* Discord -> Twitch\n${message}`);
}

function sendDiscordMessage(channel, message) {
	channel.send(message);
	console.log(`* Twitch -> Discord\n${message}`);
}
/* END Helper functions */
