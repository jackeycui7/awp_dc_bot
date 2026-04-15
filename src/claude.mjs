// Claude API client with tool_use loop
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tools } from './tools/definitions.mjs';
import { executeTool } from './tools/executor.mjs';
import { knowledgeIndex } from './knowledge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lazy-initialize client so dotenv has time to run before we read process.env
let _client = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    });
    console.log('[claude] client init — base:', process.env.ANTHROPIC_BASE_URL, 'model:', process.env.ANTHROPIC_MODEL);
  }
  return _client;
}
function getModel() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}
const MAX_TOOL_ROUNDS = 8;

// Build system prompt
const soulRaw = readFileSync(join(__dirname, '..', 'SOUL.md'), 'utf-8');
const systemPrompt = `${soulRaw}

## Knowledge Base
${knowledgeIndex()}`;

console.log('[claude] system prompt starts with:', systemPrompt.slice(0, 80));

export async function chat(messages, onToolCall) {
  // Build the current message list for Claude
  // Normalize: user content can be array (with images) or string
  // Assistant content must be string for history, array only for tool_use rounds
  const claudeMessages = messages.map(m => {
    if (m.role === 'user') {
      // User content: keep as-is (can be array with text+image blocks)
      return { role: 'user', content: m.content };
    }
    // Assistant content: ensure it's a text string
    if (typeof m.content === 'string') {
      return { role: 'assistant', content: m.content };
    }
    // If somehow stored as array, extract text
    if (Array.isArray(m.content)) {
      const text = m.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      return { role: 'assistant', content: text || '(no response)' };
    }
    return { role: m.role, content: String(m.content) };
  });

  let rounds = 0;
  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    console.log('[claude] sending messages:', JSON.stringify(claudeMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.slice(0, 50) :
        Array.isArray(m.content) ? m.content.map(b => ({ type: b.type, ...(b.type === 'image' ? { source_type: b.source?.type } : {}) })) : '?'
    }))));

    // Retry on transient proxy errors (400 Invalid JSON, 500 no token, etc.)
    let response;
    let lastErr;
    const MAX_RETRIES = 4;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await getClient().messages.create({
          model: getModel(),
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages: claudeMessages,
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const msg = e.message || '';
        const retriable =
          msg.includes('Invalid JSON request body') ||
          msg.includes('没有可用的token') ||
          msg.includes('timeout') ||
          e.code === 'ETIMEDOUT' ||
          (e.status >= 500 && e.status < 600);
        console.error(`[claude] attempt ${attempt}/${MAX_RETRIES} failed:`, msg.slice(0, 200));
        if (!retriable || attempt === MAX_RETRIES) break;
        await new Promise(r => setTimeout(r, 500 * attempt)); // backoff: 0.5s, 1s, 1.5s
      }
    }
    if (lastErr) {
      if (lastErr.message?.includes('timeout') || lastErr.code === 'ETIMEDOUT') {
        return 'Sorry, the AI service is slow right now. Please try again later.';
      }
      return 'Sorry, the service encountered an error. Please try again later.';
    }

    // Workaround: proxy bug drops content field on tool_use responses
    if (!response.content || !Array.isArray(response.content)) {
      console.error('[claude] BUG: response.content missing!', JSON.stringify(response));
      // If stop_reason is tool_use but content is missing, it's the proxy bug
      if (response.stop_reason === 'tool_use') {
        return 'Sorry, the API proxy has a bug (tool_use response missing content). Please contact admin to check the proxy service.';
      }
      return 'Sorry, received an abnormal API response. Please try again later.';
    }

    // Check if Claude wants to use tools
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const textParts = response.content.filter(b => b.type === 'text').map(b => b.text);

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      // No tool calls, return text
      const reply = textParts.join('\n') || '(no response)';
      console.log('[claude] reply preview:', reply.slice(0, 80));
      return reply;
    }

    // Add assistant message with tool calls
    claudeMessages.push({ role: 'assistant', content: response.content });

    // Execute all tool calls and build results
    const toolResults = [];
    if (onToolCall) await onToolCall();
    for (const tu of toolUses) {
      console.log(`[tool] ${tu.name}(${JSON.stringify(tu.input)})`);
      const result = await executeTool(tu.name, tu.input);
      const resultStr = typeof result === 'string' ? result :
        result?.content ? result.content : JSON.stringify(result, null, 2);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: resultStr.slice(0, 10000), // cap tool result size
      });
    }

    // Add tool results
    claudeMessages.push({ role: 'user', content: toolResults });

    // If there was text alongside tool calls, and stop_reason is end_turn, return it
    if (response.stop_reason === 'end_turn' && textParts.length > 0) {
      return textParts.join('\n');
    }
    // Otherwise loop — Claude will process tool results and respond
  }

  return 'Query completed but too many processing rounds. Please simplify your question.';
}
