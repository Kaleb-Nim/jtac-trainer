// DashScope LLM streaming client
// Uses OpenAI-compatible SDK to stream responses from qwen-plus.
// The DASHSCOPE_API_KEY is read from process.env and never sent to the browser.

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

export type LlmToolCall = {
  name: string;
  arguments: string;
};

const DROP_BOMB_TOOL = {
  type: 'function',
  function: {
    name: 'drop_bomb',
    description: 'Release one simulated weapon at the JTAC-provided six-digit MGRS grid. Call only after the JTAC explicitly clears hot.',
    parameters: {
      type: 'object',
      properties: {
        mgrs: {
          type: 'string',
          description: 'The exact six-digit MGRS grid from the latest JTAC line-6 target-location readback.',
        },
      },
      required: ['mgrs'],
      additionalProperties: false,
    },
  },
} as const;

// Load system prompt once at module init — path relative to ws-server root
const systemPrompt = readFileSync(
  resolve(import.meta.dir, '../../../prompts/system-prompt.md'),
  'utf-8'
);

/**
 * Stream an LLM response from DashScope qwen-plus.
 * Flushes text chunks to onChunk on sentence boundaries or after 80 chars
 * to enable low-latency TTS overlap. Calls onDone when the full response
 * is complete, or onError on failure.
 */
export async function streamLlmResponse(
  transcript: string,
  conversationHistory: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal?: AbortSignal,
  bargeInPrefix?: string,
  onToolCall?: (toolCall: LlmToolCall) => void
): Promise<void> {
  console.log(`[llm] streaming started for: "${transcript.slice(0, 50)}..."`);

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      ...(bargeInPrefix ? [{ role: 'assistant' as const, content: bargeInPrefix }] : []),
      { role: 'user', content: transcript },
    ];

    const stream = await client.chat.completions.create({
      model: 'qwen-plus',
      stream: true,
      messages,
      tools: [DROP_BOMB_TOOL],
      tool_choice: 'auto',
    });

    let buffer = '';
    const toolCallDeltas = new Map<number, LlmToolCall>();

    for await (const chunk of stream) {
      // Abort early if signal fires (barge-in from new user utterance)
      if (signal?.aborted) {
        stream.controller.abort();
        console.log('[llm] aborted — user barged in');
        return;
      }

      const choice = chunk.choices[0];
      const token = choice?.delta?.content ?? '';
      for (const toolCall of choice?.delta?.tool_calls ?? []) {
        const existing = toolCallDeltas.get(toolCall.index) ?? { name: '', arguments: '' };
        const fn = toolCall.function;
        toolCallDeltas.set(toolCall.index, {
          name: existing.name + (fn?.name ?? ''),
          arguments: existing.arguments + (fn?.arguments ?? ''),
        });
      }

      if (!token) continue;

      buffer += token;

      // Flush on sentence boundary or when buffer exceeds 80 chars
      if (/[.!?]\s/.test(buffer) || buffer.length > 80) {
        onChunk(buffer);
        buffer = '';
      }
    }

    // Don't flush or signal done if aborted
    if (signal?.aborted) return;

    // Flush any remaining content
    if (buffer.length > 0) {
      onChunk(buffer);
    }

    for (const toolCall of toolCallDeltas.values()) {
      if (toolCall.name) onToolCall?.(toolCall);
    }

    onDone();
    console.log('[llm] streaming complete');
  } catch (err) {
    if (signal?.aborted) return; // swallow errors from abort
    const msg = err instanceof Error ? err.message : String(err);
    onError(msg);
  }
}
