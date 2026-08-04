/**
 * Client-side AI Story Generation Module
 *
 * DeepSeek API çağrıları Firebase Functions (generateStory) üzerinden
 * güvenli şekilde yapılır. API anahtarı istemciye GÖMÜLMEZ.
 *
 * System prompt ve tüm AI parametreleri SUNUCU TARAFINDAN
 * buildStoryPrompt() ile oluşturulur — istemci DEĞİŞTİREMEZ.
 */

// ── Types ────────────────────────────────────────────────────

export interface PreviousChapter {
  chapterNumber: number;
  title: string;
  content: string;
  chosenOption?: string;
}

export interface GenerateStoryPayload {
  storyTitle: string;
  storyAuthor: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: { option: 'A' | 'B'; text: string; isForceChoice: boolean };
  chapterNumber: number;
}

export interface GenerateStoryResult {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Bir sonraki hikaye bölümünü üretir.
 * Firebase Functions (generateStory) üzerinden güvenli şekilde
 * DeepSeek API'ye çağrı yapar. API anahtarı istemciye GÖMÜLMEZ.
 */
export async function generateStoryChapter(
  payload: GenerateStoryPayload,
  _timeoutMs: number = 20000
): Promise<GenerateStoryResult> {
  if (!payload.storyTitle || !payload.chosenFate) {
    throw new Error('storyTitle ve chosenFate zorunludur');
  }

  // Dinamik import — Firebase Functions SDK sadece çağrı anında yüklenir
  const { callGenerateStory } = await import('@/lib/functions-client');

  try {
    return await callGenerateStory(payload);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      const colonIdx = msg.indexOf(': ');
      const clean = colonIdx > 0 ? msg.slice(colonIdx + 2) : msg;
      throw new Error(clean || 'AI hikaye üretimi başarısız oldu.');
    }
    throw err;
  }
}
