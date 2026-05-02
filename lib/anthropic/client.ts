import Anthropic from '@anthropic-ai/sdk';
import { getServerEnv } from '@/lib/env';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const env = getServerEnv();
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export function getModelId(): string {
  return getServerEnv().ANTHROPIC_MODEL;
}
