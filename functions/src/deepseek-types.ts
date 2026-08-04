// ── DeepSeek API Types ────────────────────────────────────────

export type DeepSeekRole = 'system' | 'user' | 'assistant';

export interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
}

export type DeepSeekResponseFormat = 'text' | 'json_object';

export interface DeepSeekRequestOptions {
  /** Model adı — varsayılan DEFAULT_MODEL sabitinden alınır */
  model?: string;
  /** Sıcaklık 0-2 arası, varsayılan 0.9 */
  temperature?: number;
  /** Maksimum çıktı token'ı, pozitif ve üst sınırda */
  maxTokens?: number;
  /** Yanıt formatı: text veya json_object */
  responseFormat?: DeepSeekResponseFormat;
  /** Milisaniye cinsinden timeout, varsayılan DEFAULT_TIMEOUT_MS */
  timeoutMs?: number;
  /** Retry sayısı, varsayılan DEFAULT_MAX_RETRIES */
  maxRetries?: number;
}

export interface DeepSeekUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface DeepSeekResult {
  content: string;
  model: string;
  finishReason: string | null;
  usage: DeepSeekUsage | null;
}
