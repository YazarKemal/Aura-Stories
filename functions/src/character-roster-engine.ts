import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { callDeepSeek } from './deepseek';
import type {
  CharacterRosterInput,
  CharacterRosterOutput,
  CharacterRosterOutputItem,
} from './types';
import { characterRosterOutputSchema } from './validation';

const MODEL = 'deepseek-v4-pro';
const MAX_TOKENS = 1200;
const TEMPERATURE = 0.35;

const rawRosterSchema = z.object({
  characters: z.array(z.object({
    name: z.string().min(1).max(100),
    role: z.string().min(1).max(160),
    personality: z.string().min(3).max(500),
    unlockedAtChapter: z.number().int().positive().max(200),
    greeting: z.string().min(3).max(700),
  }).strict()).min(1).max(6),
}).strict();

function slugify(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'karakter';
}

function compactChapter(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (clean.length <= 1800) return clean;
  return `${clean.slice(0, 900)} … ${clean.slice(-900)}`;
}

export function buildCharacterRosterPrompt(input: CharacterRosterInput): string {
  const chapters = input.chapters
    .slice(-6)
    .map(chapter => `Bölüm ${chapter.chapterNumber} — ${chapter.title}\n${compactChapter(chapter.content)}`)
    .join('\n\n');

  return `Sen Aura Stories'in hikâye evreni editörüsün. Aşağıdaki hikâyede şu ana kadar gerçekten ortaya çıkmış ve karakter odasında konuşulmaya değer kişileri çıkar.

HİKÂYE: ${input.storyTitle}
ÖZET: ${input.storySynopsis}
TÜR: ${(input.storyTags || []).join(', ') || 'Kurgu'}
MEVCUT BÖLÜM: ${input.currentChapter}

OKUNMUŞ / ÜRETİLMİŞ BÖLÜMLER:
${chapters || '(Henüz ayrıca üretilmiş bölüm yok; yalnızca özetten çıkarım yap.)'}

KURALLAR:
1. Yalnızca adı açıkça verilen veya özette açık biçimde ana karakter olduğu anlaşılan kişileri ekle. Yeni karakter uydurma.
2. Anlatıcıyı, yazarı, Aura'yı, uygulamayı veya soyut güçleri karakter olarak ekleme.
3. En fazla 6 karakter seç. Aynı kişiyi farklı adlarla iki kez ekleme.
4. role kısa ve hikâyeye özgü olsun.
5. personality karakterin davranışını gerçekten ayırt eden 3-6 özellik içersin; tür etiketi kopyası olmasın.
6. unlockedAtChapter karakterin ilk görünür olduğu bölüm olsun; 1 ile ${input.currentChapter} arasında olmalı.
7. greeting 1-3 kısa cümle olsun. Karakter doğrudan karşısındaki kişiye konuşsun; "okuyucu", "kullanıcı" veya "yapay zekâ" deme.
8. Greeting mevcut bölümden ilerisine spoiler vermesin; karakter yalnızca bu noktaya kadar bilebileceği şeyleri ima etsin.
9. Karakterlerin konuşma sesleri birbirinden ayırt edilebilir olsun.

SADECE geçerli JSON döndür:
{"characters":[{"name":"...","role":"...","personality":"...","unlockedAtChapter":1,"greeting":"..."}]}`;
}

export function normalizeCharacterRoster(
  input: CharacterRosterInput,
  raw: unknown,
): CharacterRosterOutput {
  const parsed = rawRosterSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpsError(
      'internal',
      `Karakter listesi geçersiz: ${parsed.error.issues.map(issue => issue.message).join(', ')}`,
    );
  }

  const seenNames = new Set<string>();
  const characters: CharacterRosterOutputItem[] = [];

  for (const item of parsed.data.characters) {
    const normalizedName = item.name.trim().toLocaleLowerCase('tr-TR');
    if (seenNames.has(normalizedName)) continue;
    seenNames.add(normalizedName);

    characters.push({
      id: `${input.storyId}-${slugify(item.name)}`,
      name: item.name.trim(),
      role: item.role.trim(),
      personality: item.personality.trim(),
      unlockedAtChapter: Math.max(1, Math.min(input.currentChapter, item.unlockedAtChapter)),
      greeting: item.greeting.trim(),
      storyId: input.storyId,
    });
  }

  if (characters.length === 0) {
    throw new HttpsError('internal', 'Hikâyeden konuşulabilir bir karakter çıkarılamadı.');
  }

  const output: CharacterRosterOutput = {
    characters,
    sourceRevision: `chapter-${input.currentChapter}`,
  };

  const checked = characterRosterOutputSchema.safeParse(output);
  if (!checked.success) {
    throw new HttpsError('internal', 'Karakter listesi doğrulanamadı.');
  }
  return checked.data;
}

export async function generateCharacterRosterFromStory(
  input: CharacterRosterInput,
  timeoutMs: number,
): Promise<CharacterRosterOutput> {
  const result = await callDeepSeek(
    [{ role: 'system', content: buildCharacterRosterPrompt(input) }],
    {
      model: MODEL,
      thinkingMode: 'disabled',
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
      responseFormat: 'json_object',
      timeoutMs,
      maxRetries: 1,
    },
  );

  const cleaned = result.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new HttpsError('internal', 'AI karakter listesi geçerli JSON formatında değil.');
  }

  return normalizeCharacterRoster(input, raw);
}
