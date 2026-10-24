# ClashPulse — Discord & WhatsApp Bot Companion

This bot connects your Clash of Clans village (`PLAYER_TAG`) to **Discord** and **WhatsApp** so you get automatic morning briefings, 15-minute builder completion alerts, and ideal strategy recommendations without opening the tracker website.

## Quick Start (3 Steps)

1. Copy `.env.example` to `.env` and fill in your `PLAYER_TAG` and either your `DISCORD_WEBHOOK_URL` or WhatsApp credentials:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies and start the bot:
   ```bash
   npm install
   npm start
   ```
3. To get a free **Official Clash of Clans API Token**, visit https://developer.clashofclans.com/, create a key for your IP address, and paste it into `COC_API_TOKEN` in `.env`.
