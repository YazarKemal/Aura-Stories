import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { deepseekApiKey } from './config';
import { callDeepSeek } from './deepseek';
import { buildStoryPrompt, buildChatPrompt } from './prompts';
import { checkRateLimit } from './rate-limiter';
import {
  reserveCredits,
  completeTransaction,
  refundTransaction,
  getCompletedLedger,
  claimDailyGift,
  grantAdReward,
  grantEntitlement,
  type EconomyAction,
} from './economy';
import {
  chatOperationSchema,
  storyGenerateOperationSchema,
  chapterOutputSchema,
  claimGiftOperationSchema,
  unlockActionSchema,
  forceFateActionSchema,
} from './validation';

import type { CharacterChatOutput, GenerateStoryOutput } from './types';

// ── Init ──────────────────────────────────────────────────────

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

// ── Sabitler ──────────────────────────────────────────────────

const DEEPSEEK_MODEL = 'deepseek-chat';
const STORY_MAX_TOKENS = 1500;
const CHAT_MAX_TOKENS = 600;
const CHAT_TIMEOUT_SECONDS = 30;
const STORY_TIMEOUT_SECONDS = 55;

// ── Helpers ───────────────────────────────────────────────────

function requireAuth(r: { auth?: { uid: string } }): string {
  if (!r.auth?.uid) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  return r.auth.uid;
}

function logError(ctx: string, err: unknown): void {
  const msg = err instanceof Error ? err.message.slice(0, 150) : String(err).slice(0, 150);
  console.error(`[${ctx}] ${msg}`);
}

function parseStoryJson(raw: string): GenerateStoryOutput {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch {
    throw new HttpsError('internal', 'AI yanıtı geçerli JSON formatında değil.');
  }
  const result = chapterOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpsError('internal', `AI yanıtı eksik/geçersiz: ${result.error.issues.map(i => i.message).join(', ')}`);
  }
  return result.data;
}

/** Kredi düşüldükten SONRA oluşan hatada iade yapılması gerekip gerekmediğini kontrol eder */
function isRefundableError(err: unknown): boolean {
  // Input validation, auth, rate-limit → kredi düşülmeden önce oluşur → iade YOK
  if (err instanceof HttpsError) {
    const code = (err as any).code;
    if (code === 'invalid-argument' || code === 'unauthenticated' || code === 'resource-exhausted') {
      return false;
    }
  }
  // Diğer tüm hatalar (DeepSeek, timeout, parse, internal) → iade VAR
  return true;
}

// ═══════════════════════════════════════════════════════════════
// AI FUNCTION: characterChat
// ═══════════════════════════════════════════════════════════════

export const characterChat = onCall<CharacterChatOutput>({
  secrets: [deepseekApiKey], memory: '256MiB', timeoutSeconds: CHAT_TIMEOUT_SECONDS, concurrency: 1,
}, async (request) => {
  const uid = requireAuth(request);

  const parsed = chatOperationSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Geçersiz: ${parsed.error.issues.map(i => i.message).join(', ')}`);
  }

  const input = parsed.data;
  const operationId = input.operationId;
  const action: EconomyAction = 'chat_message';

  // Replay kontrolü: tamamlanmış işlem tekrar çağrılırsa AI çalıştırma
  const completed = await getCompletedLedger(uid, operationId);
  if (completed) {
    throw new HttpsError('already-exists', 'Bu işlem zaten tamamlandı. Yeni operationId ile tekrar deneyin.');
  }

  await checkRateLimit(uid, 'characterChat');

  // ── Kredi rezervasyonu (transaction içinde idempotency) ──
  let reservation: Awaited<ReturnType<typeof reserveCredits>>;
  try {
    reservation = await reserveCredits(uid, action, operationId);
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_CREDITS') throw new HttpsError('failed-precondition', 'Yetersiz jeton.');
    if (err?.code === 'IDEMPOTENCY_MISMATCH') throw new HttpsError('already-exists', err.message);
    if (err?.code === 'ALREADY_FINALIZED') throw new HttpsError('already-exists', err.message);
    throw new HttpsError('internal', 'Jeton işlemi başarısız.');
  }

  if (reservation.alreadyReserved) {
    throw new HttpsError('already-exists', 'Bu işlem zaten işleniyor. Lütfen bekleyin.');
  }

  const systemPrompt = buildChatPrompt(input);
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...input.messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
  ];

  try {
    const result = await callDeepSeek(messages, {
      model: DEEPSEEK_MODEL, temperature: 0.9, maxTokens: CHAT_MAX_TOKENS,
      timeoutMs: (CHAT_TIMEOUT_SECONDS - 5) * 1000,
    });

    await completeTransaction(uid, operationId, result.content.slice(0, 100));

    return { text: result.content, characterName: input.characterName, memoryUpdates: null };
  } catch (err: unknown) {
    logError('characterChat', err);
    if (isRefundableError(err)) {
      await refundTransaction(uid, operationId);
    }
    throw new HttpsError('internal', 'AI yanıtı alınamadı. Jetonunuz iade edildi.');
  }
});

// ═══════════════════════════════════════════════════════════════
// AI FUNCTION: generateStory
// ═══════════════════════════════════════════════════════════════

export const generateStory = onCall<GenerateStoryOutput>({
  secrets: [deepseekApiKey], memory: '512MiB', timeoutSeconds: STORY_TIMEOUT_SECONDS, concurrency: 1,
}, async (request) => {
  const uid = requireAuth(request);

  const parsed = storyGenerateOperationSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Geçersiz: ${parsed.error.issues.map(i => i.message).join(', ')}`);
  }

  const input = parsed.data;
  const operationId = input.operationId;
  const action: EconomyAction = input.action;
  const storyId = input.storyId;

  // action ↔ isForceChoice tutarlılık kontrolü
  if (action === 'force_fate' && !input.chosenFate.isForceChoice) {
    throw new HttpsError('invalid-argument', 'force_fate action için isForceChoice=true olmalı.');
  }
  if (action === 'chapter_unlock' && input.chosenFate.isForceChoice) {
    throw new HttpsError('invalid-argument', 'chapter_unlock action için isForceChoice=false olmalı.');
  }

  // Replay kontrolü
  const completed = await getCompletedLedger(uid, operationId);
  if (completed) {
    throw new HttpsError('already-exists', 'Bu işlem zaten tamamlandı.');
  }

  await checkRateLimit(uid, 'generateStory');

  // ── Kredi rezervasyonu ──
  try {
    await reserveCredits(uid, action, operationId, storyId);
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_CREDITS') throw new HttpsError('failed-precondition', `Yetersiz jeton.`);
    if (err?.code === 'IDEMPOTENCY_MISMATCH') throw new HttpsError('already-exists', err.message);
    if (err?.code === 'ALREADY_FINALIZED') throw new HttpsError('already-exists', err.message);
    throw new HttpsError('internal', 'Jeton işlemi başarısız.');
  }

  const systemPrompt = buildStoryPrompt(input);

  try {
    const result = await callDeepSeek(
      [{ role: 'system', content: systemPrompt }],
      { model: DEEPSEEK_MODEL, temperature: 0.9, maxTokens: STORY_MAX_TOKENS, responseFormat: 'json_object', timeoutMs: (STORY_TIMEOUT_SECONDS - 5) * 1000 }
    );

    const parsed2 = parseStoryJson(result.content);

    // Başarılı → ledger'ı tamamla + entitlement ver
    await completeTransaction(uid, operationId, result.content.slice(0, 100));
    await grantEntitlement(uid, input.storyId, action, input.chapterNumber).catch(e => logError('entitlement', e));

    return parsed2;
  } catch (err: unknown) {
    logError('generateStory', err);
    if (isRefundableError(err)) {
      await refundTransaction(uid, operationId);
    }
    throw new HttpsError('internal', 'Hikaye üretilemedi. Jetonunuz iade edildi.');
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTION-BASED CALLABLES (client yalnızca action gönderir)
// ═══════════════════════════════════════════════════════════════

export const unlockChapter = onCall<{ success: boolean; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parsed = unlockActionSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));

    const { operationId, storyId, chapterNumber } = parsed.data;

    const reservation = await reserveCredits(uid, 'chapter_unlock', operationId, storyId);
    if (reservation.alreadyReserved) {
      return { success: true, balanceAfter: reservation.balanceAfter };
    }

    await completeTransaction(uid, operationId);
    await grantEntitlement(uid, storyId, 'chapter_unlock', chapterNumber).catch(e => logError('entitlement', e));

    return { success: true, balanceAfter: reservation.balanceAfter };
  }
);

export const forceFate = onCall<{ success: boolean; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parsed = forceFateActionSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));

    const { operationId, storyId, chapterNumber } = parsed.data;

    const reservation = await reserveCredits(uid, 'force_fate', operationId, storyId);
    if (reservation.alreadyReserved) {
      return { success: true, balanceAfter: reservation.balanceAfter };
    }

    await completeTransaction(uid, operationId);
    await grantEntitlement(uid, storyId, 'force_fate', chapterNumber).catch(e => logError('entitlement', e));

    return { success: true, balanceAfter: reservation.balanceAfter };
  }
);

// ── Daily Gift (client amount GÖNDEREMEZ) ─────────────────────

export const claimDailyGiftCallable = onCall<{ success: boolean; amount: number; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parsed = claimGiftOperationSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));

    try {
      const result = await claimDailyGift(uid, parsed.data.operationId);
      return { success: true, amount: result.amount, balanceAfter: result.balanceAfter };
    } catch (err: any) {
      if (err?.code === 'ALREADY_CLAIMED') throw new HttpsError('failed-precondition', 'Bugün zaten aldınız.');
      throw new HttpsError('internal', 'Hediye alınamadı.');
    }
  }
);

// ── Ad Reward (her zaman simülasyon, gerçek kredi YOK) ────────

export const grantAdRewardCallable = onCall<{ success: boolean; simulated: boolean }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    requireAuth(request);
    // İstemciden HİÇBİR parametre alınmaz — mode yok, amount yok
    const result = await grantAdReward();
    // simulated her zaman true — gerçek kredi YAZILMAZ
    return { success: true, simulated: result.simulated };
  }
);
