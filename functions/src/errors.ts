// ── DeepSeek Hata Sınıfları ──────────────────────────────────

export type DeepSeekErrorCode =
  | 'CONFIGURATION'
  | 'INVALID_INPUT'
  | 'AUTHENTICATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'UPSTREAM'
  | 'INVALID_RESPONSE';

export class DeepSeekError extends Error {
  readonly code: DeepSeekErrorCode;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    message: string,
    code: DeepSeekErrorCode,
    retryable: boolean,
    statusCode?: number
  ) {
    super(message);
    this.name = 'DeepSeekError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

// ── Hata fabrika yardımcıları ─────────────────────────────────

export function configurationError(message: string): DeepSeekError {
  return new DeepSeekError(message, 'CONFIGURATION', false);
}

export function invalidInputError(message: string): DeepSeekError {
  return new DeepSeekError(message, 'INVALID_INPUT', false);
}

export function authError(statusCode: number): DeepSeekError {
  return new DeepSeekError(
    'API kimlik doğrulaması başarısız. Lütfen yapılandırmayı kontrol edin.',
    'AUTHENTICATION',
    false,
    statusCode
  );
}

export function rateLimitError(statusCode: number): DeepSeekError {
  return new DeepSeekError(
    'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.',
    'RATE_LIMIT',
    true,
    statusCode
  );
}

export function timeoutError(timeoutMs: number): DeepSeekError {
  return new DeepSeekError(
    `İstek zaman aşımına uğradı (${timeoutMs / 1000}s).`,
    'TIMEOUT',
    true
  );
}

export function upstreamError(
  statusCode: number,
  detail?: string
): DeepSeekError {
  const msg = detail
    ? `Upstream API hatası (${statusCode}): ${sanitizeDetail(detail)}`
    : `Upstream API hatası (${statusCode}).`;
  return new DeepSeekError(msg, 'UPSTREAM', true, statusCode);
}

export function invalidResponseError(detail: string): DeepSeekError {
  return new DeepSeekError(
    `Geçersiz API yanıtı: ${sanitizeDetail(detail)}`,
    'INVALID_RESPONSE',
    false
  );
}

/**
 * Hata mesajlarına sızabilecek uzun body/header içeriğini
 * güvenli uzunluğa kırpar.
 */
function sanitizeDetail(detail: string): string {
  return detail.length > 100 ? detail.slice(0, 100) + '…' : detail;
}
