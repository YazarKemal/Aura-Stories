import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { deepseekApiKey } from './config';
import { callDeepSeek } from './deepseek';
import { buildChatPrompt } from './prompts';
import { generateAuraStory } from './story-engine';
import { generateCharacterRosterFromStory } from './character-roster-engine';
import { checkRateLimit } from './rate-limiter';
import {
  reserveCredits, finalizeTransaction, finalizeSimpleTransaction,
  refundTransaction, getCompletedLedger, claimDailyGift, grantAdReward,
  COST, type EconomyAction,
} from './economy';
import {
  chatOperationSchema, storyGenerateOperationSchema,
  characterRosterInputSchema,
  claimGiftOperationSchema, fullAccessActionSchema,
} from './validation';
import type {
  CharacterChatOutput,
  CharacterRosterOutput,
  GenerateStoryOutput,
} from './types';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

const DEEPSEEK_MODEL = 'deepseek-chat';
const CHAT_MAX_TOKENS = 600;
const CHAT_TIMEOUT_SECONDS = 30;
const CHARACTER_ROSTER_TIMEOUT_SECONDS = 35;
const CHARACTER_ROSTER_CALL_TIMEOUT_MS = 28_000;
// Düşük kalite skoru alan hikâyelerde opsiyonel editör geçişi yapılabildiği için
// tek çağrılı eski akıştan daha geniş bir timeout bütçesi gerekir.
const STORY_TIMEOUT_SECONDS = 105;
const STORY_ENGINE_CALL_TIMEOUT_MS = 38_000;

function requireAuth(r: { auth?: { uid: string } }): string {
  if (!r.auth?.uid) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  return r.auth.uid;
}

function logError(ctx: string, err: unknown): void {
  const msg = err instanceof Error ? err.message.slice(0, 150) : String(err).slice(0, 150);
  console.error(`[${ctx}] ${msg}`);
}

function isRefundableError(err: unknown): boolean {
  if (err instanceof HttpsError) {
    const c = (err as any).code;
    if (c === 'invalid-argument' || c === 'unauthenticated' || c === 'resource-exhausted') return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// characterChat
// ═══════════════════════════════════════════════════════════════

export const characterChat = onCall<CharacterChatOutput>({
  secrets: [deepseekApiKey], memory: '256MiB', timeoutSeconds: CHAT_TIMEOUT_SECONDS, concurrency: 1,
}, async (request) => {
  const uid = requireAuth(request);
  const parsed = chatOperationSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));
  const { operationId } = parsed.data;

  const completed = await getCompletedLedger(uid, operationId);
  if (completed) throw new HttpsError('already-exists', 'Bu işlem zaten tamamlandı.');

  await checkRateLimit(uid, 'characterChat');

  const reservation = await reserveCredits(uid, 'chat_message', operationId).catch((err: any) => {
    if (err?.code === 'INSUFFICIENT_CREDITS') throw new HttpsError('failed-precondition', 'Yetersiz jeton.');
    if (err?.code === 'IDEMPOTENCY_MISMATCH' || err?.code === 'ALREADY_FINALIZED') throw new HttpsError('already-exists', err.message);
    throw new HttpsError('internal', 'Jeton işlemi başarısız.');
  });

  if (reservation.alreadyReserved) {
    throw new HttpsError('already-exists', 'Bu işlem zaten işleniyor.');
  }

  const input = parsed.data;
  const systemPrompt = buildChatPrompt(input);
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...input.messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
  ];

  try {
    const result = await callDeepSeek(messages, {
      model: DEEPSEEK_MODEL,
      temperature: 0.82,
      maxTokens: CHAT_MAX_TOKENS,
      timeoutMs: (CHAT_TIMEOUT_SECONDS - 5) * 1000,
    });
    await finalizeSimpleTransaction(uid, operationId, result.content.slice(0, 100));
    return { text: result.content, characterName: input.characterName, memoryUpdates: null };
  } catch (err: unknown) {
    logError('characterChat', err);
    if (isRefundableError(err)) await refundTransaction(uid, operationId);
    throw new HttpsError('internal', 'AI yanıtı alınamadı. Jetonunuz iade edildi.');
  }
});

// ═══════════════════════════════════════════════════════════════
// generateCharacterRoster — hikâye metninden karakter odası üretir
// ═══════════════════════════════════════════════════════════════

export const generateCharacterRoster = onCall<CharacterRosterOutput>({
  secrets: [deepseekApiKey],
  memory: '256MiB',
  timeoutSeconds: CHARACTER_ROSTER_TIMEOUT_SECONDS,
  concurrency: 1,
}, async (request) => {
  const uid = requireAuth(request);
  const parsed = characterRosterInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));
  }

  await checkRateLimit(uid, 'characterRoster');

  try {
    return await generateCharacterRosterFromStory(
      parsed.data,
      CHARACTER_ROSTER_CALL_TIMEOUT_MS,
    );
  } catch (err: unknown) {
    logError('generateCharacterRoster', err);
    if (err instanceof HttpsError && err.code === 'resource-exhausted') throw err;
    throw new HttpsError('internal', 'Karakter Odası şu anda hazırlanamadı.');
  }
});

// ═══════════════════════════════════════════════════════════════
// generateStory
// ═══════════════════════════════════════════════════════════════

export const generateStory = onCall<GenerateStoryOutput>({
  secrets: [deepseekApiKey], memory: '512MiB', timeoutSeconds: STORY_TIMEOUT_SECONDS, concurrency: 1,
}, async (request) => {
  const uid = requireAuth(request);
  const parsed = storyGenerateOperationSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));

  const input = parsed.data;
  const { operationId, action, storyId, chapterNumber } = input;

  if (action === 'force_fate' && !input.chosenFate.isForceChoice) {
    throw new HttpsError('invalid-argument', 'force_fate için isForceChoice=true olmalı.');
  }
  if (action === 'chapter_unlock' && input.chosenFate.isForceChoice) {
    throw new HttpsError('invalid-argument', 'chapter_unlock için isForceChoice=false olmalı.');
  }

  const completed = await getCompletedLedger(uid, operationId);
  if (completed) throw new HttpsError('already-exists', 'Bu işlem zaten tamamlandı.');

  await checkRateLimit(uid, 'generateStory');

  const reservation = await reserveCredits(uid, action, operationId, storyId).catch((err: any) => {
    if (err?.code === 'INSUFFICIENT_CREDITS') throw new HttpsError('failed-precondition', 'Yetersiz jeton.');
    if (err?.code === 'IDEMPOTENCY_MISMATCH' || err?.code === 'ALREADY_FINALIZED') throw new HttpsError('already-exists', err.message);
    throw new HttpsError('internal', 'Jeton işlemi başarısız.');
  });

  if (reservation.alreadyReserved) {
    throw new HttpsError('already-exists', 'Bu işlem zaten işleniyor. Yeni operationId ile tekrar deneyin.');
  }

  try {
    const engineResult = await generateAuraStory(input, STORY_ENGINE_CALL_TIMEOUT_MS);

    console.info('[generateStory] quality', {
      storyId,
      chapterNumber,
      score: engineResult.quality.score,
      rewritten: engineResult.rewritten,
      issueCount: engineResult.quality.issues.length,
    });

    await finalizeTransaction(
      uid,
      operationId,
      storyId,
      action,
      chapterNumber,
      engineResult.raw.slice(0, 100),
    );

    return engineResult.output;
  } catch (err: unknown) {
    logError('generateStory', err);
    if (isRefundableError(err)) await refundTransaction(uid, operationId);
    throw new HttpsError('internal', 'Hikaye üretilemedi. Jetonunuz iade edildi.');
  }
});

// ═══════════════════════════════════════════════════════════════
// purchaseFullAccess — sunucu maliyeti COST.full_access belirler
// ═══════════════════════════════════════════════════════════════

export const purchaseFullAccess = onCall<{ success: boolean; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parsed = fullAccessActionSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));

    const { operationId, storyId } = parsed.data;

    const reservation = await reserveCredits(uid, 'full_access', operationId, storyId).catch((err: any) => {
      if (err?.code === 'INSUFFICIENT_CREDITS') throw new HttpsError('failed-precondition', `Yetersiz jeton. Gereken: ${COST.full_access}.`);
      if (err?.code === 'IDEMPOTENCY_MISMATCH') throw new HttpsError('already-exists', err.message);
      throw new HttpsError('internal', 'Jeton işlemi başarısız.');
    });

    if (reservation.alreadyReserved) return { success: true, balanceAfter: reservation.balanceAfter };

    await finalizeTransaction(uid, operationId, storyId, 'full_access');

    return { success: true, balanceAfter: reservation.balanceAfter };
  }
);

// ═══════════════════════════════════════════════════════════════
// Daily Gift
// ═══════════════════════════════════════════════════════════════

export const claimDailyGiftCallable = onCall<{ success: boolean; amount: number; balanceAfter: number }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    const uid = requireAuth(request);
    const parsed = claimGiftOperationSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.issues.map(i => i.message).join(', '));
    try {
      const r = await claimDailyGift(uid, parsed.data.operationId);
      return { success: true, amount: r.amount, balanceAfter: r.balanceAfter };
    } catch (err: any) {
      if (err?.code === 'ALREADY_CLAIMED') throw new HttpsError('failed-precondition', 'Bugün zaten aldınız.');
      throw new HttpsError('internal', 'Hediye alınamadı.');
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// Ad Reward — her zaman simülasyon
// ═══════════════════════════════════════════════════════════════

export const grantAdRewardCallable = onCall<{ success: boolean; simulated: boolean }>(
  { memory: '128MiB', timeoutSeconds: 10 },
  async (request) => {
    requireAuth(request);
    const result = await grantAdReward();
    return { success: true, simulated: result.simulated };
  }
);
