import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { deepseekApiKey } from './config';
import { callDeepSeek } from './deepseek';
import { buildStoryPrompt, buildChatPrompt } from './prompts';
import { checkRateLimit } from './rate-limiter';
import {
  spendCredits,
  addCredits,
  claimDailyGift,
  grantAdReward,
  CHAT_MESSAGE_COST,
  CHAPTER_UNLOCK_COST,
  FORCE_FATE_COST,
  AD_REWARD_AMOUNT,
} from './economy';
import {
  characterChatInputSchema,
  generateStoryInputSchema,
  chapterOutputSchema,
  economyOperationSchema,
  claimGiftOperationSchema,
  adRewardOperationSchema,
  storyGenerateOperationSchema,
  chatOperationSchema,
} from './validation';

import type {
  CharacterChatOutput,
  GenerateStoryOutput,
} from './types';

// ── One-time initialization ──────────────────────────────────

initializeApp();

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 3,
});

// ── Sabit sunucu kontrollü parametreler ──────────────────────

const DEEPSEEK_MODEL = 'deepseek-chat';
const STORY_MAX_TOKENS = 1500;
const CHAT_MAX_TOKENS = 600;
const CHAT_TIMEOUT_SECONDS = 30;
const STORY_TIMEOUT_SECONDS = 55;

// ── Auth helper ──────────────────────────────────────────────

function requireAuth(request: { auth?: { uid: string } }): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.');
  }
  return request.auth.uid;
}

// ── Safe error logger ────────────────────────────────────────

function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    const message = err.message.slice(0, 150);
    console.error(`[${context}] ${err.name}: ${message}`);
  } else {
    console.error(`[${context}] Bilinmeyen hata tipi`);
  }
}

// ── JSON Parsing ─────────────────────────────────────────────

function parseStoryJson(raw: string): GenerateStoryOutput {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpsError('internal', 'AI yanıtı geçerli JSON formatında değil.');
  }

  const result = chapterOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => i.message).join(', ');
    throw new HttpsError('internal', `AI yanıtında eksik/geçersiz alan: ${issues}`);
  }

  return result.data;
}

// ── Helpers ──────────────────────────────────────────────────

function makeOperationId(uid: string, prefix: string): string {
  return `${prefix}_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════
// AI FUNCTIONS (kredi kontrollü)
// ═══════════════════════════════════════════════════════════════

// ── characterChat ────────────────────────────────────────────

export const characterChat = onCall<CharacterChatOutput>(
  {
    secrets: [deepseekApiKey],
    memory: '256MiB',
    timeoutSeconds: CHAT_TIMEOUT_SECONDS,
    concurrency: 1,
    // TODO(prod): enforceAppCheck: true
  },
  async (request) => {
    const uid = requireAuth(request);

    // operationId zorunlu — idempotency için
    const parseResult = chatOperationSchema.safeParse(request.data);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => i.message).join(', ');
      throw new HttpsError('invalid-argument', `Geçersiz parametre: ${issues}`);
    }

    const input = parseResult.data;
    const operationId = input.operationId;

    // Rate limit kontrolü
    await checkRateLimit(uid, 'characterChat');

    // ── SERVER-SIDE KREDİ KONTROLÜ ──────────────────────────
    // İstemci spendCredits çağırsa bile sunucu TEKRAR kontrol eder.
    // Idempotency sayesinde aynı operationId çift ücretlendirilmez.
    let creditSpent = false;
    try {
      await spendCredits(uid, CHAT_MESSAGE_COST, operationId, 'Chat mesajı');
      creditSpent = true;
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_CREDITS') {
        throw new HttpsError('failed-precondition', 'Yetersiz jeton. Lütfen jeton kazanın.');
      }
      if (err?.code === 'USER_NOT_FOUND') {
        throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
      }
      throw new HttpsError('internal', 'Jeton işlemi başarısız.');
    }

    const systemPrompt = buildChatPrompt(input);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...input.messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      })),
    ];

    try {
      const result = await callDeepSeek(messages, {
        model: DEEPSEEK_MODEL,
        temperature: 0.9,
        maxTokens: CHAT_MAX_TOKENS,
        timeoutMs: (CHAT_TIMEOUT_SECONDS - 5) * 1000,
      });

      return {
        text: result.content,
        characterName: input.characterName,
        memoryUpdates: null,
      };
    } catch (err: unknown) {
      logError('characterChat', err);

      // ── DeepSeek hatasında jeton İADESİ (tek sefer) ─────
      if (creditSpent) {
        try {
          await addCredits(
            uid, CHAT_MESSAGE_COST,
            `refund_${operationId}`,
            'add',
            'Chat API hatası — iade'
          );
        } catch (refundErr) {
          logError('characterChat/refund', refundErr);
        }
      }

      throw new HttpsError('internal', 'AI yanıtı alınamadı. Jetonunuz iade edildi.');
    }
  }
);

// ── generateStory ────────────────────────────────────────────

export const generateStory = onCall<GenerateStoryOutput>(
  {
    secrets: [deepseekApiKey],
    memory: '512MiB',
    timeoutSeconds: STORY_TIMEOUT_SECONDS,
    concurrency: 1,
    // TODO(prod): enforceAppCheck: true
  },
  async (request) => {
    const uid = requireAuth(request);

    const parseResult = storyGenerateOperationSchema.safeParse(request.data);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => i.message).join(', ');
      throw new HttpsError('invalid-argument', `Geçersiz parametre: ${issues}`);
    }

    const input = parseResult.data;
    const operationId = input.operationId;

    // Hikaye tipine göre jeton maliyeti (istemci sabitleriyle eşleşir)
    const cost = input.isForceChoice ? FORCE_FATE_COST : CHAPTER_UNLOCK_COST;

    // Rate limit kontrolü
    await checkRateLimit(uid, 'generateStory');

    // ── SERVER-SIDE KREDİ KONTROLÜ ──────────────────────────
    let creditSpent = false;
    try {
      await spendCredits(uid, cost, operationId,
        input.isForceChoice ? 'Kader zorlama' : 'Bölüm açma');
      creditSpent = true;
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_CREDITS') {
        throw new HttpsError('failed-precondition', `Yetersiz jeton. Gereken: ${cost}.`);
      }
      if (err?.code === 'USER_NOT_FOUND') {
        throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
      }
      throw new HttpsError('internal', 'Jeton işlemi başarısız.');
    }

    const systemPrompt = buildStoryPrompt(input);

    try {
      const result = await callDeepSeek(
        [{ role: 'system', content: systemPrompt }],
        {
          model: DEEPSEEK_MODEL,
          temperature: 0.9,
          maxTokens: STORY_MAX_TOKENS,
          responseFormat: 'json_object',
          timeoutMs: (STORY_TIMEOUT_SECONDS - 5) * 1000,
        }
      );

      return parseStoryJson(result.content);
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      logError('generateStory', err);

      // ── DeepSeek hatasında jeton İADESİ (tek sefer) ─────
      if (creditSpent) {
        try {
          await addCredits(
            uid, cost,
            `refund_${operationId}`,
            'add',
            `Hikaye API hatası — iade (${cost} jeton)`
          );
        } catch (refundErr) {
          logError('generateStory/refund', refundErr);
        }
      }

      throw new HttpsError('internal', 'Hikaye üretilemedi. Jetonunuz iade edildi.');
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// EKONOMİ FUNCTIONS (server-authoritative)
// ═══════════════════════════════════════════════════════════════

/**
 * Jeton harcama. İstemci bu fonksiyonu kullanarak güvenli
 * şekilde jeton harcar. Firestore transaction ile atomiktir.
 *
 * KULLANIM:
 *   - Chat mesajı:         amount=5
 *   - Bölüm açma (vote):   amount=15
 *   - Kader zorlama:       amount=50
 *   - Tam erişim:          amount=75
 */
export const spendCreditsCallable = onCall<{ success: boolean; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parseResult = economyOperationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument',
        `Geçersiz parametre: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
    }

    const { amount, operationId, detail } = parseResult.data;

    try {
      const result = await spendCredits(uid, amount, operationId, detail);
      return { success: true, balanceAfter: result.balanceAfter };
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_CREDITS') {
        throw new HttpsError('failed-precondition', err.message || 'Yetersiz bakiye.');
      }
      throw new HttpsError('internal', 'Jeton işlemi başarısız.');
    }
  }
);

/**
 * Günlük hediye. Sunucu UTC zamanı kullanır,
 * istemci saatine GÜVENMEZ.
 */
export const claimDailyGiftCallable = onCall<{ success: boolean; amount: number; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parseResult = claimGiftOperationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument',
        `Geçersiz parametre: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
    }

    const { operationId } = parseResult.data;

    try {
      const result = await claimDailyGift(uid, operationId);
      return { success: true, amount: result.amount, balanceAfter: result.balanceAfter };
    } catch (err: any) {
      if (err?.code === 'ALREADY_CLAIMED') {
        throw new HttpsError('failed-precondition', 'Bugün zaten hediyenizi aldınız.');
      }
      throw new HttpsError('internal', 'Hediye alınamadı.');
    }
  }
);

/**
 * Reklam ödülü jetonu ekler.
 * Simulation modunda gerçek kredi YAZILMAZ.
 */
export const grantAdRewardCallable = onCall<{ success: boolean; balanceAfter: number; simulated: boolean }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parseResult = adRewardOperationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument',
        `Geçersiz parametre: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
    }

    const { operationId, mode } = parseResult.data;

    const result = await grantAdReward(uid, operationId, mode || 'simulation');
    return { success: true, balanceAfter: result.balanceAfter, simulated: result.simulated };
  }
);
