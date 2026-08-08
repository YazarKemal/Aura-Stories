import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { deepseekApiKey } from './config';
import { callDeepSeek } from './deepseek';
import { buildChatPrompt } from './prompts';
import { generateAuraStory } from './story-engine';
import { generateCharacterRosterFromStory } from './character-roster-engine';
import {
  applyDynamicChatEffects,
  formatDynamicStoryForCharacter,
  formatDynamicStoryForNarrative,
  loadDynamicStoryState,
  setDynamicParticipantPreferences,
} from './dynamic-story';
import { checkRateLimit } from './rate-limiter';
import {
  reserveCredits, finalizeTransaction, finalizeSimpleTransaction,
  refundTransaction, getCompletedLedger, claimDailyGift, grantAdReward,
  COST,
} from './economy';
import {
  chatOperationSchema,
  characterChatModelOutputSchema,
  storyGenerateOperationSchema,
  characterRosterInputSchema,
  claimGiftOperationSchema,
  fullAccessActionSchema,
} from './validation';
import type {
  CharacterChatOutput,
  CharacterRosterOutput,
  DynamicChatEffects,
  GenerateStoryOutput,
} from './types';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

const DEEPSEEK_MODEL = 'deepseek-chat';
const CHAT_MAX_TOKENS = 950;
const CHAT_TIMEOUT_SECONDS = 35;
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

function emptyDynamicEffects(): DynamicChatEffects {
  return { events: [], relationshipDeltas: [] };
}

/**
 * JSON responseFormat kullanıyoruz; yine de model beklenmedik biçimde yalnız
 * metin döndürürse Character Room tamamen kırılmasın. Reply kurtarılır fakat
 * world-state etkisi fail-closed biçimde boş bırakılır.
 */
function parseCharacterChatModelResult(raw: string): { reply: string; effects: DynamicChatEffects } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    const json = JSON.parse(cleaned);
    const parsed = characterChatModelOutputSchema.safeParse(json);
    if (parsed.success) {
      const relationshipDeltas = parsed.data.effects.relationshipDeltas.filter(delta =>
        delta.trust !== 0 || delta.affinity !== 0 || delta.suspicion !== 0 || delta.hostility !== 0,
      );
      const events = parsed.data.effects.events.filter(event =>
        event.shouldAffectStory || event.type === 'identity_claim',
      );
      const participant = parsed.data.effects.participant?.status === 'none'
        ? undefined
        : parsed.data.effects.participant;
      return {
        reply: parsed.data.reply,
        effects: { events, relationshipDeltas, participant },
      };
    }

    // Şema kısmen bozulduysa kullanıcıya görünen reply alanını yine kurtar.
    if (json && typeof json === 'object' && typeof (json as any).reply === 'string') {
      console.warn('[characterChat] Dynamic effect şeması geçersiz; reply korundu.');
      return { reply: (json as any).reply, effects: emptyDynamicEffects() };
    }
  } catch {
    // Aşağıdaki plain-text fallback'e geç.
  }

  console.warn('[characterChat] Model JSON dönmedi; Dynamic Story etkileri kaydedilmedi.');
  return { reply: raw.trim() || 'Sana cevap veremedim.', effects: emptyDynamicEffects() };
}

async function getCurrentBranchChapter(uid: string, storyId: string): Promise<number> {
  const db = getFirestore();
  const [progressSnap, entitlementSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('progress').doc(storyId).get(),
    db.collection('users').doc(uid).collection('entitlements').doc(storyId).get(),
  ]);

  const progressChapter = Number(progressSnap.data()?.activeChapter || 1);
  const unlocked = entitlementSnap.data()?.unlockedChapters;
  const entitlementChapter = Array.isArray(unlocked) && unlocked.length > 0
    ? Math.max(...unlocked.filter((value: unknown): value is number => typeof value === 'number'))
    : 1;

  return Math.max(1, Math.min(200, progressChapter, Math.max(progressChapter, entitlementChapter)));
}

// ═══════════════════════════════════════════════════════════════
// characterChat — Character Room + Dynamic Story event extraction
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

  const clientInput = parsed.data;

  try {
    // Karakter yalnız kendi yaşadığı Dynamic Story olaylarını görür; tüm branch
    // bilgisini verip karakteri omniscient hale getirmiyoruz.
    const [worldState, currentChapter] = await Promise.all([
      loadDynamicStoryState(uid, clientInput.storyId),
      getCurrentBranchChapter(uid, clientInput.storyId),
    ]);

    const input = {
      ...clientInput,
      dynamicContext: formatDynamicStoryForCharacter(worldState, clientInput.characterName),
    };
    const systemPrompt = buildChatPrompt(input);
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...input.messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
    ];

    const result = await callDeepSeek(messages, {
      model: DEEPSEEK_MODEL,
      temperature: 0.78,
      maxTokens: CHAT_MAX_TOKENS,
      responseFormat: 'json_object',
      timeoutMs: (CHAT_TIMEOUT_SECONDS - 6) * 1000,
      maxRetries: 1,
    });

    const modelResult = parseCharacterChatModelResult(result.content);
    const hasWorldEffects =
      modelResult.effects.events.length > 0
      || modelResult.effects.relationshipDeltas.length > 0
      || Boolean(modelResult.effects.participant);

    const nextWorldState = hasWorldEffects
      ? await applyDynamicChatEffects(
          uid,
          clientInput.storyId,
          clientInput.characterName,
          modelResult.effects,
          currentChapter,
        )
      : worldState;

    await finalizeSimpleTransaction(uid, operationId, modelResult.reply.slice(0, 100));

    return {
      text: modelResult.reply,
      characterName: clientInput.characterName,
      memoryUpdates: null,
      worldUpdate: {
        revision: nextWorldState.revision,
        participantStatus: nextWorldState.participant.status,
        canonicalEvents: modelResult.effects.events.filter(event => event.shouldAffectStory).length,
      },
    };
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
// generateStory — canonical Dynamic Story state'i anlatıma taşır
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
    // Persona paylaşım/kimlik tercihleri server-side branch metadata'sına yazılır.
    await setDynamicParticipantPreferences(uid, storyId, input.readerPersona);
    const worldState = await loadDynamicStoryState(uid, storyId);
    const engineInput = {
      ...input,
      dynamicContext: formatDynamicStoryForNarrative(worldState),
    };

    const engineResult = await generateAuraStory(engineInput, STORY_ENGINE_CALL_TIMEOUT_MS);

    console.info('[generateStory] quality', {
      storyId,
      chapterNumber,
      dynamicRevision: worldState.revision,
      participantStatus: worldState.participant.status,
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
