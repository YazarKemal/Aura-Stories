import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { deepseekApiKey } from './config';
import { callDeepSeek } from './deepseek';
import { buildStoryPrompt, buildChatPrompt } from './prompts';
import { checkRateLimit } from './rate-limiter';
import {
  characterChatInputSchema,
  generateStoryInputSchema,
  chapterOutputSchema,
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
// İstemci bu değerleri DEĞİŞTİREMEZ.

/** DeepSeek için sabit model */
const DEEPSEEK_MODEL = 'deepseek-chat';

/** Story generation için sabit max_tokens */
const STORY_MAX_TOKENS = 1500;

/** Chat için sabit max_tokens */
const CHAT_MAX_TOKENS = 600;

/** Chat fonksiyonu timeout (sn) */
const CHAT_TIMEOUT_SECONDS = 30;

/** Story fonksiyonu timeout (sn) */
const STORY_TIMEOUT_SECONDS = 55;

// ── Auth helper ──────────────────────────────────────────────

function requireAuth(request: { auth?: { uid: string } }): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş yapmalısınız.');
  }
  return request.auth.uid;
}

// ── Safe error logger ────────────────────────────────────────

/**
 * Hata log'larında API anahtarı, token veya hassas veri SIZDIRMAZ.
 * deepseek.ts zaten kendi hata mesajlarını sanitize eder —
 * burada yalnızca hata tipi ve ilk 100 karakter loglanır.
 */
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

// ── characterChat ────────────────────────────────────────────

export const characterChat = onCall<CharacterChatOutput>(
  {
    secrets: [deepseekApiKey],
    memory: '256MiB',
    timeoutSeconds: CHAT_TIMEOUT_SECONDS,
    concurrency: 1,

    // TODO(prod): Kapalı test başarılı olduktan sonra enforceAppCheck: true yap.
    // Öncesinde Google Play Console → App Integrity → Play Integrity API
    // etkinleştirilmeli. Capacitor Android'de debug token Firebase Console'a
    // kaydedilmeli. Bkz: https://firebase.google.com/docs/app-check/capacitor
    // enforceAppCheck: true,
  },
  async (request) => {
    const uid = requireAuth(request);

    const parseResult = characterChatInputSchema.safeParse(request.data);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => i.message).join(', ');
      throw new HttpsError('invalid-argument', `Geçersiz parametre: ${issues}`);
    }

    const input = parseResult.data;

    // Rate limit kontrolü (Firestore tabanlı, localStorage'a GÜVENMEZ)
    await checkRateLimit(uid, 'characterChat');

    // System prompt SUNUCU TARAFINDA oluşturulur.
    // İstemci systemPrompt, model, max_tokens veya API endpoint GÖNDEREMEZ.
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
      throw new HttpsError('internal', 'AI yanıtı alınamadı. Lütfen tekrar deneyin.');
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

    // TODO(prod): Kapalı test başarılı olduktan sonra enforceAppCheck: true yap.
    // enforceAppCheck: true,
  },
  async (request) => {
    const uid = requireAuth(request);

    const parseResult = generateStoryInputSchema.safeParse(request.data);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => i.message).join(', ');
      throw new HttpsError('invalid-argument', `Geçersiz parametre: ${issues}`);
    }

    const input = parseResult.data;

    // Rate limit kontrolü (Firestore tabanlı)
    await checkRateLimit(uid, 'generateStory');

    // System prompt SUNUCU TARAFINDA oluşturulur.
    // İstemci systemPrompt, model, max_tokens veya API endpoint GÖNDEREMEZ.
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
      throw new HttpsError('internal', 'Hikaye üretilemedi. Lütfen tekrar deneyin.');
    }
  }
);
