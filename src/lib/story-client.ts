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

/**
 * ReadingView'in ilk/küratörlü bölüm metni eski story-engine state'inde tutulmuyor.
 * AI devamı üretilirken DOM'daki gerçek okuma paragraflarından yalnızca generated
 * chapter'lara ait olmayanları ayırıp Bölüm 1 bağlamı olarak ekleriz.
 * Böylece ilk AI bölümü yalnızca kısa synopsis'ten devam etmeye çalışmaz.
 */
function extractSourceChapterContext(
  previousChapters: PreviousChapter[],
): PreviousChapter | null {
  if (typeof document === 'undefined') return null;
  if (previousChapters.some(chapter => chapter.chapterNumber === 1)) return null;

  const paragraphTexts = Array.from(
    document.querySelectorAll<HTMLElement>('[class*="group/para"] p')
  )
    .map(node => node.textContent?.trim() || '')
    .filter(text => text.length >= 20);

  if (paragraphTexts.length === 0) return null;

  const generatedBodies = previousChapters.map(chapter => chapter.content);
  const sourceParagraphs = paragraphTexts.filter(text =>
    !generatedBodies.some(content => content.includes(text))
  );

  if (sourceParagraphs.length === 0) return null;

  const content = sourceParagraphs.slice(0, 20).join('\n\n').slice(0, 8000);
  if (content.length < 50) return null;

  return {
    chapterNumber: 1,
    title: 'Başlangıç',
    content,
  };
}

function buildContinuityChapters(previousChapters: PreviousChapter[]): PreviousChapter[] {
  const sourceChapter = extractSourceChapterContext(previousChapters);
  const merged = sourceChapter ? [sourceChapter, ...previousChapters] : previousChapters;

  // Server uzun dönem hafızayı sıkıştırarak kullandığı için 30 bölüme kadar
  // süreklilik taşıyabilir. Aşılırsa ilk kaynak bölümü + en yeni 29 bölüm korunur.
  if (merged.length <= 30) return merged;
  const first = merged[0];
  const recent = merged.slice(-29);
  return first ? [first, ...recent.filter(chapter => chapter.chapterNumber !== first.chapterNumber)] : recent;
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
  const previousChapters = buildContinuityChapters(payload.previousChapters);

  try {
    return await callGenerateStory({
      ...payload,
      previousChapters,
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
