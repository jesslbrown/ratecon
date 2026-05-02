import type Anthropic from '@anthropic-ai/sdk';
import {
  rateConExtractionSchema,
  type RateConExtraction,
} from '@/lib/validators/rate-con';
import { getAnthropicClient, getModelId } from './client';
import {
  MAX_API_RETRIES,
  MAX_INPUT_BYTES,
  SYSTEM_PROMPT,
  USER_PROMPT,
} from './prompt';

export type ExtractionInput = {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  // Opaque user identifier used only for anonymized log correlation.
  userId: string;
};

export type ExtractionSuccess = {
  ok: true;
  data: RateConExtraction;
  rawResponse: string;
  usage: { input_tokens: number; output_tokens: number };
};

export type ExtractionError = {
  ok: false;
  reason:
    | 'input_too_large'
    | 'unsupported_content_type'
    | 'api_failure'
    | 'parse_failure'
    | 'empty_response';
  message: string;
  rawResponse?: string;
};

export type ExtractionResult = ExtractionSuccess | ExtractionError;

const SUPPORTED_TYPES = new Set<ExtractionInput['contentType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function extractRateCon(
  input: ExtractionInput,
): Promise<ExtractionResult> {
  if (input.buffer.byteLength > MAX_INPUT_BYTES) {
    return {
      ok: false,
      reason: 'input_too_large',
      message: `File exceeds ${MAX_INPUT_BYTES / 1024 / 1024}MB limit.`,
    };
  }

  if (!SUPPORTED_TYPES.has(input.contentType)) {
    return {
      ok: false,
      reason: 'unsupported_content_type',
      message: `Unsupported content type: ${input.contentType}`,
    };
  }

  const client = getAnthropicClient();
  const apiResult = await callWithRetry(client, input);
  if (!apiResult.ok) return apiResult;

  const { rawText, usage } = apiResult;
  const json = safeParseJson(rawText);
  if (!json) {
    return {
      ok: false,
      reason: 'parse_failure',
      message: 'Model response was not valid JSON.',
      rawResponse: rawText,
    };
  }

  const validated = rateConExtractionSchema.safeParse(json);
  if (!validated.success) {
    return {
      ok: false,
      reason: 'parse_failure',
      message: validated.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
      rawResponse: rawText,
    };
  }

  logExtraction({
    userId: input.userId,
    contentType: input.contentType,
    bytes: input.buffer.byteLength,
    usage,
  });

  return { ok: true, data: validated.data, rawResponse: rawText, usage };
}

type ApiCallOk = {
  ok: true;
  rawText: string;
  usage: { input_tokens: number; output_tokens: number };
};

async function callWithRetry(
  client: Anthropic,
  input: ExtractionInput,
): Promise<ApiCallOk | ExtractionError> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: getModelId(),
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              buildSourceBlock(input),
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return {
          ok: false,
          reason: 'empty_response',
          message: 'Model returned no text content.',
        };
      }

      return {
        ok: true,
        rawText: textBlock.text,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_API_RETRIES) {
        await sleep(2 ** attempt * 250);
      }
    }
  }
  return {
    ok: false,
    reason: 'api_failure',
    message: errorMessage(lastError) ?? 'Anthropic API failed after retries.',
  };
}

function buildSourceBlock(input: ExtractionInput) {
  const base64 = input.buffer.toString('base64');
  if (input.contentType === 'application/pdf') {
    return {
      type: 'document' as const,
      source: {
        type: 'base64' as const,
        media_type: 'application/pdf' as const,
        data: base64,
      },
    };
  }
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: input.contentType,
      data: base64,
    },
  };
}

function safeParseJson(text: string): unknown {
  // Strip ```json fences the model occasionally adds despite instructions.
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function errorMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Hook for analytics. Anonymized — no buffer contents, no extracted PII.
function logExtraction(meta: {
  userId: string;
  contentType: string;
  bytes: number;
  usage: { input_tokens: number; output_tokens: number };
}) {
  // TODO(analytics): forward to PostHog / a Supabase audit table.
  console.info('[extraction]', {
    user: meta.userId.slice(0, 8),
    type: meta.contentType,
    kb: Math.round(meta.bytes / 1024),
    tokens_in: meta.usage.input_tokens,
    tokens_out: meta.usage.output_tokens,
  });
}
