const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Clash of Clans Player Tag for automatic upgrade tracking')
    .addStringOption(opt => opt.setName('tag').setDescription('Your Player Tag (e.g. #2PP89J0YL)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('Get your 30-second Busy Chief daily overview & next login window'),
  new SlashCommandBuilder()
    .setName('strategy')
    .setDescription('Get your ideal next 3 upgrades tailored to your schedule')
    .addStringOption(opt =>
      opt.setName('mode').setDescription('Choose your lifestyle strategy').addChoices(
        { name: 'Busy (1 Login/Day)', value: 'busy_daily' },
        { name: 'War / CWL (Keep Heroes Awake)', value: 'cwl_war' },
        { name: 'Weekend Farmer', value: 'weekend_warrior' },
        { name: 'Rush Recovery', value: 'rush_fixer' }
      )
    ),
  new SlashCommandBuilder()
    .setName('builders')
    .setDescription('View live countdowns for all 6 Builders and Laboratory'),
  new SlashCommandBuilder()
    .setName('loot')
    .setDescription('Check exact Gold, Elixir, and Dark Elixir needed before your next builder frees up'),
  new SlashCommandBuilder()
    .setName('sleepcheck')
    .setDescription('Verify no builder timers expire during your 11 PM - 8 AM sleep window')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken((process.env.DISCORD_BOT_TOKEN || '').trim());

(async () => {
  try {
    console.log('[ClashPulse] Registering global slash commands...');
    await rest.put(Routes.applicationCommands((process.env.DISCORD_CLIENT_ID || '').trim()), { body: commands });
    console.log('[ClashPulse] Official Slash Commands registered!');
  } catch (err) {
    console.error('[ClashPulse] Failed to register commands:', err);
  }
})();
