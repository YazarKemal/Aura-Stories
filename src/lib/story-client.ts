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
  const readerPersona = payload.readerPersona || await getReaderPersona(payload.storyId);

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
