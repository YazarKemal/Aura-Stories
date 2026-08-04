/**
 * Firebase Functions İstemcisi — Aura Stories
 *
 * DeepSeek API çağrıları ve ekonomi işlemleri Firebase Functions
 * üzerinden yapılır. İstemci Firestore credits/role/vipUntil
 * alanlarını DOĞRUDAN DEĞİŞTİREMEZ (firestore.rules ile korunur).
 *
 * GÜVENLİK:
 * - API anahtarı yalnızca Functions Secret Manager'da
 * - İstemci systemPrompt, model, max_tokens, temperature GÖNDEREMEZ
 * - Tüm jeton işlemleri server-authoritative (Firestore transaction)
 * - Idempotency: operationId ile çift ücretlendirme önlenir
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

interface CallableResult<T> {
  readonly data: T;
}

// ── Benzersiz operationId üretimi ────────────────────────────

let _idCounter = 0;
export function makeOperationId(prefix: string): string {
  _idCounter++;
  return `${prefix}_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════
// AI FUNCTIONS (kredi kontrollü)
// ═══════════════════════════════════════════════════════════════

/**
 * Hikaye bölümü üretir.
 * Firebase Functions → generateStory onCall → DeepSeek API
 * operationId zorunlu — idempotency ve kredi kontrolü için.
 */
export async function callGenerateStory(
  payload: GenerateStoryPayload & { operationId: string; isForceChoice: boolean }
): Promise<GenerateStoryResult> {
  const fn = httpsCallable<typeof payload, GenerateStoryResult>(
    functions(), 'generateStory'
  );
  const result: CallableResult<GenerateStoryResult> = await fn(payload);
  return result.data;
}

/**
 * Karakterle sohbet mesajı gönderir.
 * Firebase Functions → characterChat onCall → DeepSeek API
 * operationId zorunlu — idempotency ve kredi kontrolü için.
 */
export async function callCharacterChat(
  payload: ChatRequestPayload & { operationId: string }
): Promise<ChatResponsePayload> {
  const fn = httpsCallable<typeof payload, ChatResponsePayload>(
    functions(), 'characterChat'
  );
  const result: CallableResult<ChatResponsePayload> = await fn(payload);
  return result.data;
}

// ═══════════════════════════════════════════════════════════════
// EKONOMİ FUNCTIONS (server-authoritative)
// ═══════════════════════════════════════════════════════════════

export interface SpendResult {
  success: boolean;
  balanceAfter: number;
}

/**
 * Jeton harcar. Firestore transaction ile atomik.
 * İstemci Firestore'u doğrudan DEĞİŞTİREMEZ.
 */
export async function callSpendCredits(
  amount: number,
  operationId: string,
  detail: string
): Promise<SpendResult> {
  const fn = httpsCallable<{ amount: number; operationId: string; detail: string }, SpendResult>(
    functions(), 'spendCreditsCallable'
  );
  const result: CallableResult<SpendResult> = await fn({ amount, operationId, detail });
  return result.data;
}

export interface ClaimGiftResult {
  success: boolean;
  amount: number;
  balanceAfter: number;
}

/**
 * Günlük hediye. Sunucu UTC zamanı kullanır.
 */
export async function callClaimDailyGift(
  operationId: string
): Promise<ClaimGiftResult> {
  const fn = httpsCallable<{ operationId: string }, ClaimGiftResult>(
    functions(), 'claimDailyGiftCallable'
  );
  const result: CallableResult<ClaimGiftResult> = await fn({ operationId });
  return result.data;
}

export interface AdRewardResult {
  success: boolean;
  balanceAfter: number;
  simulated: boolean;
}

/**
 * Reklam ödülü. Simulation modunda gerçek kredi YAZILMAZ.
 */
export async function callGrantAdReward(
  operationId: string,
  mode?: 'simulation' | 'production'
): Promise<AdRewardResult> {
  const fn = httpsCallable<{ operationId: string; mode?: string }, AdRewardResult>(
    functions(), 'grantAdRewardCallable'
  );
  const result: CallableResult<AdRewardResult> = await fn({ operationId, mode });
  return result.data;
}
