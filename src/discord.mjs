// Discord message handler
import { addMessage, getMessages, withUserLock } from './sessions.mjs';
import { chat } from './claude.mjs';

const MAX_DISCORD_LEN = 1900;
const RATE_LIMIT = new Map(); // userId -> [timestamps]
const RATE_WINDOW = 60000;
const RATE_MAX = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  let times = RATE_LIMIT.get(userId) || [];
  times = times.filter(t => now - t < RATE_WINDOW);
  if (times.length >= RATE_MAX) return false;
  times.push(now);
  RATE_LIMIT.set(userId, times);
  return true;
}

function splitMessage(text) {
  if (text.length <= MAX_DISCORD_LEN) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > MAX_DISCORD_LEN) {
    let cut = remaining.lastIndexOf('\n\n', MAX_DISCORD_LEN);
    if (cut < 200) cut = remaining.lastIndexOf('\n', MAX_DISCORD_LEN);
    if (cut < 200) cut = remaining.lastIndexOf(' ', MAX_DISCORD_LEN);
    if (cut < 200) cut = MAX_DISCORD_LEN;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function downloadImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/png';
    return { base64: buf.toString('base64'), mediaType: mime };
  } catch {
    return null;
  }
}

async function extractContent(message) {
  const parts = [];
  let text = message.content || '';

  // Strip bot mention from channel messages
  if (message.guild) {
    text = text.replace(/<@!?\d+>/g, '').trim();
  }

  if (text) {
    parts.push({ type: 'text', text });
  }

  // Extract images from attachments — download and convert to base64
  for (const att of message.attachments.values()) {
    if (att.contentType?.startsWith('image/')) {
      const img = await downloadImageAsBase64(att.url);
      if (img) {
        parts.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 }
        });
      }
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: '(empty message)' }];
}

export async function handleMessage(message) {
  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs — only respond in guild channels
  if (!message.guild) return;

  // In channels, only respond when mentioned
  if (!message.mentions.has(message.client.user)) return;

  const userId = message.author.id;

  // Rate limit
  if (!checkRateLimit(userId)) {
    await message.reply('你发得太快了，请稍等一下再问 😅');
    return;
  }

  // Show typing
  await message.channel.sendTyping();
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 8000);

  try {
    await withUserLock(userId, async () => {
      // Build user message content
      const content = await extractContent(message);

      // Add to session
      addMessage(userId, 'user', content);

      // Get full conversation history
      const messages = getMessages(userId);

      // Call Claude
      const reply = await chat(messages);

      // Add assistant reply to session
      addMessage(userId, 'assistant', reply);

      // Send response (split if needed)
      const chunks = splitMessage(reply);
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          await message.reply(chunks[i]);
        } else {
          await message.channel.send(chunks[i]);
        }
      }
    });
  } catch (e) {
    console.error('Message handling error:', e);
    await message.reply('抱歉，处理出错了，请稍后再试。').catch(() => {});
  } finally {
    clearInterval(typingInterval);
  }
}
