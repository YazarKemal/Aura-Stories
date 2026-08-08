/**
 * DeepSeek API İstemcisi — Sunucu Tarafı
 *
 * Firebase Cloud Functions (Gen 2) ortamında çalışır.
 * API anahtarını defineSecret üzerinden runtime'da okur.
 * Tip güvenli, timeout destekli, kontrollü retry içerir.
 */
import { deepseekApiKey } from './config';
import type {
  DeepSeekMessage,
  DeepSeekRequestOptions,
  DeepSeekResponseFormat,
  DeepSeekResult,
  DeepSeekThinkingMode,
  DeepSeekUsage,
} from './deepseek-types';
import {
  authError,
  configurationError,
  invalidInputError,
  invalidResponseError,
  rateLimitError,
  timeoutError,
  upstreamError,
} from './errors';

// ── Sabitler ──────────────────────────────────────────────────

/** Aura Stories'in varsayılan üretim modeli. */
const DEFAULT_MODEL = 'deepseek-v4-pro';

/**
 * V4 thinking varsayılan olarak açık gelir. Aura'da chat/story sıcaklık ayarlarını
 * gerçekten kullanmak ve mobil gecikmeyi sınırlamak için açıkça kapatıyoruz.
 */
const DEFAULT_THINKING_MODE: DeepSeekThinkingMode = 'disabled';

/** Varsayılan HTTP timeout (ms) */
const DEFAULT_TIMEOUT_MS = 25_000;

/** Varsayılan retry sayısı */
const DEFAULT_MAX_RETRIES = 2;

/** Varsayılan sıcaklık */
const DEFAULT_TEMPERATURE = 0.9;

/** Varsayılan maksimum token */
const DEFAULT_MAX_TOKENS = 1500;

/** Maksimum token üst sınırı */
const MAX_TOKENS_UPPER_BOUND = 8192;

/** DeepSeek Chat Completions endpoint'i */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/** Geçici hatalar — bunlarda retry yapılır */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// ── Public API ────────────────────────────────────────────────

/**
 * DeepSeek Chat Completions API'sine güvenli istek gönderir.
 *
 * @param messages  - En az bir geçerli system/user/assistant mesajı içermeli
 * @param options   - Model, sıcaklık, thinking, timeout, retry gibi seçenekler
 * @returns DeepSeekResult — content, model, finishReason, usage
 *
 * API anahtarı tanımlı değilse CONFIGURATION hatası fırlatır.
 * Geçici hatalarda exponential backoff + jitter ile retry yapar.
 * Hata mesajlarında API anahtarı veya Authorization header bulunmaz.
 */
export async function callDeepSeek(
  messages: readonly DeepSeekMessage[],
  options?: DeepSeekRequestOptions
): Promise<DeepSeekResult> {
  // ── 1. Secret kontrolü ─────────────────────────────────
  const apiKey = deepseekApiKey.value();

  if (!apiKey || apiKey.length === 0) {
    throw configurationError(
      'DEEPSEEK_API_KEY tanımlanmamış. ' +
      'firebase functions:secrets:set DEEPSEEK_API_KEY ile tanımlayın.'
    );
  }

  // ── 2. Input validasyonu ───────────────────────────────
  validateInput(messages, options);

  // ── 3. Seçenekleri normalize et ────────────────────────
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const thinkingMode = options?.thinkingMode ?? DEFAULT_THINKING_MODE;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const contentType = options?.responseFormat ?? 'text';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const body = buildRequestBody(
    messages,
    model,
    temperature,
    thinkingMode,
    maxTokens,
    contentType,
  );

  // ── 4. Retry döngüsü ──────────────────────────────────
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await performRequest(apiKey, body, timeoutMs);
    } catch (err: unknown) {
      lastError = err;

      if (!isRetryable(err) || attempt >= maxRetries) {
        throw err;
      }

      // Exponential backoff + jitter: 1s, 2s, 4s, ...
      const baseMs = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 500;
      await sleep(baseMs + jitter);
    }
  }

  // Bu satıra hiç ulaşılmamalı (loop her durumda throw eder)
  throw lastError;
}

// ── HTTP İstek Katmanı ────────────────────────────────────────

/**
 * Tek bir HTTP isteği gönderir. Test edilebilmesi için ayrılmıştır.
 * @internal
 */
async function performRequest(
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<DeepSeekResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data: unknown = await response.json();
    return parseResponse(data);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw timeoutError(timeoutMs);
    }
    if (err instanceof Error && err.name === 'DeepSeekError') {
      throw err;
    }
    throw upstreamError(
      0,
      err instanceof Error ? err.message : 'Bilinmeyen ağ hatası'
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Response İşleme ───────────────────────────────────────────

interface RawChoice {
  message?: { content?: string };
  finish_reason?: string | null;
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface RawResponse {
  choices?: RawChoice[];
  model?: string;
  usage?: RawUsage;
}

function parseResponse(data: unknown): DeepSeekResult {
  if (!isObject(data)) {
    throw invalidResponseError('Yanıt geçerli bir JSON nesnesi değil.');
  }

  const raw = data as RawResponse;
  if (!Array.isArray(raw.choices) || raw.choices.length === 0) {
    throw invalidResponseError('choices dizisi boş veya eksik.');
  }

  const first = raw.choices[0];
  if (!first || !first.message || typeof first.message.content !== 'string') {
    throw invalidResponseError('choices[0].message.content eksik veya geçersiz.');
  }

  const content: string = first.message.content;
  const model: string = typeof raw.model === 'string' ? raw.model : 'unknown';
  const finishReason: string | null =
    typeof first.finish_reason === 'string' ? first.finish_reason : null;

  let usage: DeepSeekUsage | null = null;
  if (raw.usage && typeof raw.usage === 'object') {
    const u = raw.usage;
    if (
      typeof u.prompt_tokens === 'number' &&
      typeof u.completion_tokens === 'number' &&
      typeof u.total_tokens === 'number'
    ) {
      usage = {
        promptTokens: u.prompt_tokens,
        completionTokens: u.completion_tokens,
        totalTokens: u.total_tokens,
      };
    }
  }

  return { content, model, finishReason, usage };
}

async function handleErrorResponse(response: Response): Promise<never> {
  const status = response.status;

  if (status === 401 || status === 403) {
    throw authError(status);
  }

  if (status === 429) {
    throw rateLimitError(status);
  }

  let detail: string | undefined;
  try {
    const errBody: unknown = await response.json();
    if (isObject(errBody)) {
      const rawError = (errBody as Record<string, unknown>).error;
      if (typeof rawError === 'string') {
        detail = rawError.replace(/(?:Bearer\s+)?sk-[a-zA-Z0-9]+/g, '[REDACTED]');
      } else if (isObject(rawError) && typeof rawError.message === 'string') {
        detail = rawError.message.replace(/(?:Bearer\s+)?sk-[a-zA-Z0-9]+/g, '[REDACTED]');
      }
    }
  } catch {
    // Body okunamazsa devam et.
  }

  if (RETRYABLE_STATUSES.has(status)) {
    throw upstreamError(status, detail);
  }

  throw upstreamError(status, detail);
}

// ── Input Validasyonu ─────────────────────────────────────────

function validateInput(
  messages: readonly DeepSeekMessage[],
  options?: DeepSeekRequestOptions
): void {
  if (!messages || messages.length === 0) {
    throw invalidInputError('messages dizisi boş olamaz.');
  }

  // DeepSeek Chat Completions system-only istekleri de kabul eder. Story ve
  // roster motorları tüm görevi güvenilir system prompt'unda taşıdığı için
  // burada yapay bir user mesajı zorunluluğu koymuyoruz.
  for (const message of messages) {
    if (!message.content?.trim()) {
      throw invalidInputError('Mesaj içeriği boş olamaz.');
    }
  }

  if (options?.temperature !== undefined) {
    const t = options.temperature;
    if (typeof t !== 'number' || t < 0 || t > 2) {
      throw invalidInputError(
        `temperature 0-2 arasında olmalıdır, alınan: ${t}`
      );
    }
  }

  if (options?.thinkingMode !== undefined
      && options.thinkingMode !== 'enabled'
      && options.thinkingMode !== 'disabled') {
    throw invalidInputError('thinkingMode enabled veya disabled olmalıdır.');
  }

  if (options?.maxTokens !== undefined) {
    const m = options.maxTokens;
    if (typeof m !== 'number' || m <= 0 || m > MAX_TOKENS_UPPER_BOUND) {
      throw invalidInputError(
        `maxTokens 1-${MAX_TOKENS_UPPER_BOUND} arasında olmalıdır, alınan: ${m}`
      );
    }
  }
}

// ── Request Body ──────────────────────────────────────────────

function buildRequestBody(
  messages: readonly DeepSeekMessage[],
  model: string,
  temperature: number,
  thinkingMode: DeepSeekThinkingMode,
  maxTokens: number,
  responseFormat: DeepSeekResponseFormat
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    thinking: { type: thinkingMode },
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }

  return body;
}

// ── Yardımcılar ──────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error && err.name === 'DeepSeekError') {
    return (err as { retryable?: boolean }).retryable === true;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
