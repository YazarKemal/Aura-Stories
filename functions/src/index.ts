import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { deepseekApiKey } from './config';
import {
  characterChatInputSchema,
  generateStoryInputSchema,
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

// ── Auth helper ──────────────────────────────────────────────

/**
 * onCall request.auth Firebase callable protokolü tarafından
 * önceden doğrulanmıştır. Tekrar verifyIdToken çağrısı gerekmez.
 */
function requireAuth(request: { auth?: { uid: string } }): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.');
  }
  return request.auth.uid;
}

// ── characterChat ────────────────────────────────────────────

export const characterChat = onCall<CharacterChatOutput>(
  {
    secrets: [deepseekApiKey],
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    requireAuth(request);

    const parseResult = characterChatInputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        `Geçersiz parametre: ${parseResult.error.issues.map(i => i.message).join(', ')}`
      );
    }

    // TODO(A3): callDeepSeek ile gerçek AI yanıtı üret
    void parseResult.data as unknown;

    throw new HttpsError(
      'failed-precondition',
      'AI backend henüz yapılandırılmadı. A3 paketinde etkinleştirilecektir.'
    );
  }
);

// ── generateStory ────────────────────────────────────────────

export const generateStory = onCall<GenerateStoryOutput>(
  {
    secrets: [deepseekApiKey],
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    requireAuth(request);

    const parseResult = generateStoryInputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        `Geçersiz parametre: ${parseResult.error.issues.map(i => i.message).join(', ')}`
      );
    }

    // TODO(A4): Story Bible + plan-first generation + DeepSeek çağrısı
    void parseResult.data as unknown;

    throw new HttpsError(
      'failed-precondition',
      'AI backend henüz yapılandırılmadı. A4 paketinde etkinleştirilecektir.'
    );
  }
);
