require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const DISCORD_BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || '').trim();
const COC_API_TOKEN = (process.env.COC_API_TOKEN || '').trim();
const DEFAULT_TAG = (process.env.PLAYER_TAG || '#LGU9VVPG9').trim().toUpperCase();
const DEFAULT_NAME = (process.env.PLAYER_NAME || 'LORDRAUSHAN').trim();

const userLinks = new Map();

let villageState = {
  name: DEFAULT_NAME,
  tag: DEFAULT_TAG.startsWith('#') ? DEFAULT_TAG : '#' + DEFAULT_TAG,
  townHallLevel: 16,
  apiConnected: false,
  heroesSummary: 'Barbarian King, Archer Queen, Grand Warden, Royal Champion',
  activeBuilders: [
    { label: 'Builder #1', item: 'Inferno Tower #2', nextLevel: 10, remainingSec: 15120 },
    { label: 'Builder #2', item: 'Monolith', nextLevel: 3, remainingSec: 51840 },
    { label: 'Builder #3', item: 'Scattershot #1', nextLevel: 5, remainingSec: 34560 },
    { label: 'Builder #4', item: 'Eagle Artillery', nextLevel: 7, remainingSec: 69120 },
    { label: 'Builder #5', item: 'Blacksmith', nextLevel: 9, remainingSec: 46080 }
  ],
  priorityQueue: [
    { name: 'Grand Warden', nextLevel: 69, cost: '20.5M Elixir', durationHours: 132 },
    { name: 'Ricochet Cannon #1', nextLevel: 2, cost: '21M Gold', durationHours: 30 },
    { name: 'Multi-Archer Tower #1', nextLevel: 2, cost: '21M Gold', durationHours: 28 }
  ]
};

function formatTime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

async function syncFromOfficialCoCApi(rawTag) {
  const cleanTag = rawTag.startsWith('#') ? rawTag.toUpperCase() : '#' + rawTag.toUpperCase();
  villageState.tag = cleanTag;
  if (cleanTag === '#LGU9VVPG9') villageState.name = 'LORDRAUSHAN';

  if (!COC_API_TOKEN || COC_API_TOKEN === 'your_supercell_jwt_token_here') {
    villageState.apiConnected = false;
    return { ok: false, reason: 'Add COC_API_TOKEN in .env for live Supercell API sync' };
  }

  try {
    const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(cleanTag)}`, {
      headers: { Authorization: `Bearer ${COC_API_TOKEN}` },
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) {
      villageState.apiConnected = false;
      return { ok: false, reason: `CoC API HTTP ${res.status} (create key for your IP on developer.clashofclans.com)` };
    }
    const data = await res.json();
    villageState.name = data.name || villageState.name;
    villageState.tag = data.tag || cleanTag;
    villageState.townHallLevel = data.townHallLevel || villageState.townHallLevel;
    villageState.apiConnected = true;

    const homeHeroes = (data.heroes || []).filter(h => h.village === 'home');
    if (homeHeroes.length > 0) {
      villageState.heroesSummary = homeHeroes.map(h => `${h.name}: Lv ${h.level}/${h.maxLevel}`).join(' • ');
    }
    const liveQueue = [];
    for (const h of homeHeroes) {
      if (h.level < h.maxLevel) liveQueue.push({ name: `${h.name} (Hero)`, nextLevel: h.level + 1, cost: 'Dark Elixir / Elixir', durationHours: 120 });
    }
    for (const t of (data.troops || []).filter(x => x.village === 'home')) {
      if (t.level < t.maxLevel && liveQueue.length < 5) liveQueue.push({ name: `${t.name} (Lab)`, nextLevel: t.level + 1, cost: 'Lab Research', durationHours: 96 });
    }
    if (liveQueue.length > 0) villageState.priorityQueue = liveQueue;
    return { ok: true };
  } catch (err) {
    villageState.apiConnected = false;
    return { ok: false, reason: err.message };
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('error', (err) => console.error('[ClashPulse Client Error]:', err.message));
process.on('unhandledRejection', (err) => console.error('[ClashPulse Warning]:', err?.message || err));

client.once('clientReady', async () => {
  console.log(`[ClashPulse] Logged in as Official Discord Bot: ${client.user.tag}`);
  const res = await syncFromOfficialCoCApi(villageState.tag);
  console.log(`[ClashPulse] Active Village: ${villageState.name} (${villageState.tag}) | CoC API: ${res.ok ? 'LIVE' : res.reason}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await interaction.deferReply();
    const { commandName } = interaction;
    const activeTag = userLinks.get(interaction.user.id) || villageState.tag;

    if (commandName === 'link') {
      const rawTag = interaction.options.getString('tag', true).trim().toUpperCase();
      const formattedTag = rawTag.startsWith('#') ? rawTag : '#' + rawTag;
      userLinks.set(interaction.user.id, formattedTag);
      const syncRes = await syncFromOfficialCoCApi(formattedTag);
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`✅ Linked Village: ${villageState.name} (${villageState.tag})`)
        .setDescription(syncRes.ok ? `Live Supercell API synced! **Town Hall ${villageState.townHallLevel}**\n**Heroes:** ${villageState.heroesSummary}` : `Linked **${villageState.name} (${villageState.tag})**!\n*(${syncRes.reason})*`)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await syncFromOfficialCoCApi(activeTag);

    if (commandName === 'briefing') {
      const soonest = [...villageState.activeBuilders].sort((a, b) => a.remainingSec - b.remainingSec)[0];
      const nextUp = villageState.priorityQueue[0];
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`⚡ 30-Second Busy Chief Briefing — ${villageState.name} (${villageState.tag} • TH${villageState.townHallLevel})`)
        .addFields(
          { name: 'Logins Needed Today', value: '1 quick check-in', inline: true },
          { name: 'Soonest Builder Free', value: `${soonest.label}: **${soonest.item} → Lv ${soonest.nextLevel}** in \`${formatTime(soonest.remainingSec)}\``, inline: true },
          { name: 'Heroes', value: villageState.heroesSummary, inline: false },
          { name: 'Auto-Queue Next', value: `**${nextUp.name} → Lv ${nextUp.nextLevel}** (${nextUp.cost} • ${nextUp.durationHours}h)`, inline: false }
        )
        .setFooter({ text: villageState.apiConnected ? 'Live Supercell API Connected ✓' : 'Preset Queue Active • Whitelist your IP on developer.clashofclans.com for live API' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (commandName === 'strategy') {
      const mode = interaction.options.getString('mode') || 'busy_daily';
      const list = villageState.priorityQueue.map((item, i) => `**${i + 1}. ${item.name} → Lv ${item.nextLevel}** • ${item.cost} (${item.durationHours}h)`).join('\n');
      const embed = new EmbedBuilder().setColor(0x10b981).setTitle(`🎯 Ideal Upgrade Roadmap (${mode}) — ${villageState.name} (${villageState.tag})`).setDescription(list);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (commandName === 'builders' || commandName === 'loot' || commandName === 'sleepcheck') {
      const lines = villageState.activeBuilders.map(b => `• **${b.label}:** ${b.item} (→ Lv ${b.nextLevel}) — \`${formatTime(b.remainingSec)}\``).join('\n');
      const embed = new EmbedBuilder().setColor(0x6366f1).setTitle(`🔨 ${villageState.name} (${villageState.tag})`).setDescription(lines + '\n• **B.O.B (6th):** 🟢 Reserved for Walls / Loot Dump');
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[ClashPulse Command Error]:', err.message);
  }
});

client.login(DISCORD_BOT_TOKEN);
