/**
 * Firebase Functions İstemcisi — Aura Stories
 *
 * Ekonomi işlemleri action enum ile yapılır.
 * İstemci amount, detail, mode GÖNDEREMEZ.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { GenerateStoryPayload, GenerateStoryResult } from '@/lib/story-client';
import type { ChatRequestPayload, ChatResponsePayload } from '@/lib/chat-client';

let _functions: ReturnType<typeof getFunctions> | null = null;
function functions() { if (!_functions) _functions = getFunctions(app, 'europe-west1'); return _functions; }
interface CR<T> { readonly data: T; }

export function makeOperationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── AI Functions ──────────────────────────────────────────────

export async function callGenerateStory(
  payload: GenerateStoryPayload & { operationId: string; action: 'chapter_unlock' | 'force_fate' }
): Promise<GenerateStoryResult> {
  const fn = httpsCallable<typeof payload, GenerateStoryResult>(functions(), 'generateStory');
  return (await fn(payload) as CR<GenerateStoryResult>).data;
}

export async function callCharacterChat(
  payload: ChatRequestPayload & { operationId: string }
): Promise<ChatResponsePayload> {
  const fn = httpsCallable<typeof payload, ChatResponsePayload>(functions(), 'characterChat');
  return (await fn(payload) as CR<ChatResponsePayload>).data;
}

// ── Action-Based Economy ──────────────────────────────────────
// Client yalnızca ACTION gönderir — AMOUNT YOK

export async function callUnlockChapter(
  operationId: string, storyId: string, chapterNumber: number
): Promise<{ success: boolean; balanceAfter: number }> {
  const fn = httpsCallable<{ operationId: string; storyId: string; chapterNumber: number }, { success: boolean; balanceAfter: number }>(functions(), 'unlockChapter');
  return (await fn({ operationId, storyId, chapterNumber }) as CR<{ success: boolean; balanceAfter: number }>).data;
}

export async function callForceFate(
  operationId: string, storyId: string, chapterNumber: number
): Promise<{ success: boolean; balanceAfter: number }> {
  const fn = httpsCallable<{ operationId: string; storyId: string; chapterNumber: number }, { success: boolean; balanceAfter: number }>(functions(), 'forceFate');
  return (await fn({ operationId, storyId, chapterNumber }) as CR<{ success: boolean; balanceAfter: number }>).data;
}

export async function callClaimDailyGift(operationId: string): Promise<{ success: boolean; amount: number; balanceAfter: number }> {
  const fn = httpsCallable<{ operationId: string }, { success: boolean; amount: number; balanceAfter: number }>(functions(), 'claimDailyGiftCallable');
  return (await fn({ operationId }) as CR<{ success: boolean; amount: number; balanceAfter: number }>).data;
}

export async function callGrantAdReward(): Promise<{ success: boolean; simulated: boolean }> {
  // HİÇBİR parametre alınmaz — mode/amount YOK
  const fn = httpsCallable<{}, { success: boolean; simulated: boolean }>(functions(), 'grantAdRewardCallable');
  return (await fn({}) as CR<{ success: boolean; simulated: boolean }>).data;
}
