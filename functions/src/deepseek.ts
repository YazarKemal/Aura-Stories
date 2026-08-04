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

/** Varsayılan DeepSeek modeli */
const DEFAULT_MODEL = 'deepseek-chat';

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
 * @param messages  - En az bir user mesajı içermeli
 * @param options   - Model, sıcaklık, timeout, retry gibi istek seçenekleri
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
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const contentType = options?.responseFormat ?? 'text';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const body = buildRequestBody(messages, model, temperature, maxTokens, contentType);

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

// ── HTTP İstek Katmanı ───────────────────────────────────────

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
    // AbortError → timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw timeoutError(timeoutMs);
    }
    // DeepSeekError'ları olduğu gibi yeniden fırlat
    if (err instanceof Error && err.name === 'DeepSeekError') {
      throw err;
    }
    // Diğer network hataları
    throw upstreamError(
      0,
      err instanceof Error ? err.message : 'Bilinmeyen ağ hatası'
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Response İşleme ──────────────────────────────────────────

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

/** API yanıtını doğrular ve DeepSeekResult'a dönüştürür */
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

/** Hata durumunda uygun DeepSeekError fırlatır */
async function handleErrorResponse(response: Response): Promise<never> {
  const status = response.status;

  // 401/403 → authentication hatası, retry yapılmaz
  if (status === 401 || status === 403) {
    throw authError(status);
  }

  // 429 → rate limit, retry yapılır
  if (status === 429) {
    throw rateLimitError(status);
  }

  // Diğer hatalar
  let detail: string | undefined;
  try {
    const errBody: unknown = await response.json();
    if (isObject(errBody) && typeof (errBody as Record<string, unknown>).error === 'string') {
      const errMsg = (errBody as Record<string, unknown>).error;
      if (typeof errMsg === 'string') {
        // API key veya auth header bilgisini temizle
        detail = errMsg.replace(/(?:Bearer\s+)?sk-[a-zA-Z0-9]+/g, '[REDACTED]');
      }
    }
  } catch {
    // Body okunamazsa devam et
  }

  if (RETRYABLE_STATUSES.has(status)) {
    throw upstreamError(status, detail);
  }

  // 400 gibi diğer hatalar retry edilmez
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

  const hasUser = messages.some(m => m.role === 'user');
  if (!hasUser) {
    throw invalidInputError('messages dizisinde en az bir user mesajı bulunmalıdır.');
  }

  if (options?.temperature !== undefined) {
    const t = options.temperature;
    if (typeof t !== 'number' || t < 0 || t > 2) {
      throw invalidInputError(
        `temperature 0-2 arasında olmalıdır, alınan: ${t}`
      );
    }
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
  maxTokens: number,
  responseFormat: DeepSeekResponseFormat
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
  };

  // NOT: JSON mode kullanıldığında çağıran kodun prompt içinde
  // "JSON olarak döndür" talimatı vermesi gerekir. Aksi takdirde
  // DeepSeek API hata döndürebilir.
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
    // DeepSeekError'un retryable alanını kullan
    return (err as { retryable?: boolean }).retryable === true;
  }
  // Bilinmeyen hatalar (network vb.) retry edilir
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
