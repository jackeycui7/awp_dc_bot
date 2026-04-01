// Entry point
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleMessage } from './discord.mjs';
import { config } from 'dotenv';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // needed for DMs
});

client.once('ready', () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Serving ${client.guilds.cache.size} guild(s)`);
});

client.on('messageCreate', handleMessage);

client.login(process.env.DISCORD_BOT_TOKEN);
