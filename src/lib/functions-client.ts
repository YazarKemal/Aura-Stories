/**
 * Firebase Functions İstemcisi — Aura Stories
 *
 * DeepSeek API çağrıları Firebase Functions üzerinden yapılır.
 * Bu modül, client-side httpsCallable sarmalayıcılarını sağlar.
 *
 * GÜVENLİK:
 * - API anahtarı (DEEPSEEK_API_KEY) yalnızca Firebase Functions
 *   tarafında Secret Manager'da saklanır — istemciye GÖMÜLMEZ.
 * - İstemci systemPrompt, model, max_tokens, temperature
 *   veya API endpoint parametresi GÖNDEREMEZ.
 * - Tüm çağrılar Firebase Auth ile kimlik doğrulamalıdır.
 * - Rate limiting sunucu tarafında Firestore tabanlı uygulanır.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

import type {
  GenerateStoryPayload,
  GenerateStoryResult,
} from '@/lib/story-client';
import type {
  ChatRequestPayload,
  ChatResponsePayload,
} from '@/lib/chat-client';

// ── Lazy init ─────────────────────────────────────────────────

let _functions: ReturnType<typeof getFunctions> | null = null;

function functions() {
  if (!_functions) {
    _functions = getFunctions(app, 'europe-west1');
  }
  return _functions;
}

// ── Type-safe Callable Wrappers ──────────────────────────────

interface CallableResult<T> {
  readonly data: T;
}

/**
 * Hikaye bölümü üretir.
 * Firebase Functions → generateStory onCall → DeepSeek API
 */
export async function callGenerateStory(
  payload: GenerateStoryPayload
): Promise<GenerateStoryResult> {
  const fn = httpsCallable<GenerateStoryPayload, GenerateStoryResult>(
    functions(),
    'generateStory'
  );

  const result: CallableResult<GenerateStoryResult> = await fn(payload);
  return result.data;
}

/**
 * Karakterle sohbet mesajı gönderir.
 * Firebase Functions → characterChat onCall → DeepSeek API
 *
 * systemPrompt İSTEMCİ TARAFINDAN GÖNDERİLMEZ.
 * Lore memory verisi memoryContext olarak iletilir,
 * system prompt sunucuda buildChatPrompt() ile oluşturulur.
 */
export async function callCharacterChat(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const fn = httpsCallable<ChatRequestPayload, ChatResponsePayload>(
    functions(),
    'characterChat'
  );

  const result: CallableResult<ChatResponsePayload> = await fn(payload);
  return result.data;
}
