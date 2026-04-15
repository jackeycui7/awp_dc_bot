import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const API = 'https://discord.com/api/v10';

// Normalize unicode math-monospace chars (𝚐𝚎𝚗𝚎𝚛𝚊𝚕) back to ASCII
function normalize(s) {
  return [...(s || '')].map(c => {
    const cp = c.codePointAt(0);
    if (cp >= 0x1d68a && cp <= 0x1d6a3) return String.fromCharCode(0x61 + cp - 0x1d68a); // monospace lowercase
    if (cp >= 0x1d670 && cp <= 0x1d689) return String.fromCharCode(0x41 + cp - 0x1d670); // monospace uppercase
    return c;
  }).join('').toLowerCase();
}

const TARGET_NAMES = ['general', 'ticket', 'tickets'];
// Category IDs that group ticket sub-channels
const TICKET_CATEGORIES = ['1482256252024262718', '1482256370169544774'];

async function call(path) {
  while (true) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bot ${TOKEN}` }
    });
    if (res.status === 429) {
      const data = await res.json();
      const wait = (data.retry_after ?? 1) * 1000;
      console.log(`  rate limited, waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }
}

async function fetchAllMessages(channelId, channelName) {
  const messages = [];
  let before = null;
  while (true) {
    const qs = before ? `?limit=100&before=${before}` : '?limit=100';
    const batch = await call(`/channels/${channelId}/messages${qs}`);
    if (!batch.length) break;
    messages.push(...batch);
    console.log(`  ${channelName}: fetched ${messages.length} messages`);
    before = batch[batch.length - 1].id;
    if (batch.length < 100) break;
    await new Promise(r => setTimeout(r, 250));
  }
  return messages.reverse();
}

async function main() {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'chat_history');
  mkdirSync(outDir, { recursive: true });

  const guilds = await call('/users/@me/guilds');
  console.log(`Bot is in ${guilds.length} guild(s)`);

  for (const guild of guilds) {
    console.log(`\nGuild: ${guild.name} (${guild.id})`);
    const channels = await call(`/guilds/${guild.id}/channels`);
    // Find channels named "general", "ticket", "tickets" or containing those names
    // Also include ALL ticket-like channels (tickets is typically a category with per-user channels)
    const targets = channels.filter(c => {
      if (c.type !== 0) return false;
      const name = normalize(c.name);
      if (TARGET_NAMES.includes(name)) return true;
      if (name.includes('ticket')) return true;
      // All text channels under ticket categories
      if (TICKET_CATEGORIES.includes(c.parent_id)) return true;
      return false;
    });
    console.log(`  matched ${targets.length} channels: ${targets.map(c => normalize(c.name)).join(', ')}`);

    for (const ch of targets) {
      const chName = normalize(ch.name);
      console.log(`\nFetching #${chName} (${ch.id})`);
      try {
        const msgs = await fetchAllMessages(ch.id, chName);
        const safeName = chName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const outPath = join(outDir, `${guild.name.replace(/[^a-zA-Z0-9_-]/g, '_')}__${safeName}.json`);
        writeFileSync(outPath, JSON.stringify(msgs.map(m => ({
          id: m.id,
          timestamp: m.timestamp,
          author: `${m.author.username}${m.author.discriminator !== '0' ? '#' + m.author.discriminator : ''}`,
          author_id: m.author.id,
          bot: m.author.bot || false,
          content: m.content,
          attachments: m.attachments.map(a => a.url),
          reply_to: m.message_reference?.message_id || null
        })), null, 2));
        console.log(`  saved: ${outPath} (${msgs.length} messages)`);
      } catch (e) {
        console.error(`  error: ${e.message}`);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
