/**
 * Client-side AI Story Generation Module
 *
 * DeepSeek API çağrıları Firebase Functions (generateStory) üzerinden yapılır.
 * İstemci yalnızca ACTION enum gönderir — amount/model/temperature GÖNDEREMEZ.
 */
import { getReaderPersona, type ReaderPersona } from '@/lib/reader-persona';

export interface PreviousChapter {
  chapterNumber: number;
  title: string;
  content: string;
  chosenOption?: string;
}

export interface GenerateStoryPayload {
  storyId?: string;
  storyTitle: string;
  storyAuthor: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: { option: 'A' | 'B'; text: string; isForceChoice: boolean };
  chapterNumber: number;
  /** Kullanıcının hikâye evrenindeki kimliği. Caller'ın ayrıca doldurması gerekmez. */
  readerPersona?: ReaderPersona;
}

export interface GenerateStoryResult {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}

export async function generateStoryChapter(
  payload: GenerateStoryPayload,
  operationId: string,
  action: 'chapter_unlock' | 'force_fate',
): Promise<GenerateStoryResult> {
  if (!payload.storyTitle || !payload.chosenFate) {
    throw new Error('storyTitle ve chosenFate zorunludur');
  }

  const { callGenerateStory } = await import('@/lib/functions-client');

  // Hikâye dalları artık yalnızca anonim bir seçim üretmez. Kullanıcının Persona
  // kimliği aynı branch'e taşınır; böylece sonraki bölümlerde kişi hikâye
  // dünyasında tutarlı bir katılımcı olarak anılabilir.
  const readerPersona = payload.readerPersona || await getReaderPersona();

  try {
    return await callGenerateStory({
      ...payload,
      readerPersona,
      operationId,
      action,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      const colonIdx = msg.indexOf(': ');
      throw new Error(colonIdx > 0 ? msg.slice(colonIdx + 2) : msg || 'AI hikaye üretimi başarısız oldu.');
    }
    throw err;
  }
}
