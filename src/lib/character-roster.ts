/**
 * Character Roster — per-story character definitions
 * Each character has an `unlockedAtChapter` that gates access.
 */

import { CharacterRoster } from './types';

export const CHARACTER_ROSTERS: Record<string, CharacterRoster[]> = {
  // ═══ Gece Yarısı Güneşi (s1) — 10 chapters ═══
  s1: [
    {
      id: 's1-kerem',
      name: 'Kerem',
      role: 'Konağın Varisi',
      personality: 'gururlu, mesafeli, tutkulu, geçmişiyle yaralı',
      unlockedAtChapter: 1,
      greeting:
        'Beni burada, bu tozlu konağın gölgeleri arasında buldun demek... Pek çok kişi cesaret edip gelemezdi. Kerem ben. Sen kimsin ve neden geldin?',
      storyId: 's1',
    },
    {
      id: 's1-leyla',
      name: 'Leyla',
      role: 'Genç Araştırmacı',
      personality: 'idealist, meraklı, cesur, geçmişin izini süren',
      unlockedAtChapter: 1,
      greeting:
        'Merhaba! Ben Leyla. Bu konağın sırlarını çözmeye geldim. Sen de mi bu hikayenin peşindesin? Birlikte araştırmak ister misin?',
      storyId: 's1',
    },
    {
      id: 's1-demir-aga',
      name: 'Demir Ağa',
      role: 'Konağın Lideri',
      personality: 'otoriter, gizemli, adaletli, karanlık sırlar taşıyan',
      unlockedAtChapter: 5,
      greeting:
        '*ağır adımlarla yaklaşır* Seni burada beklemiyordum. Konağımda işin ne? Ama madem geldin... anlat bakalım.',
      storyId: 's1',
    },
    {
      id: 's1-zehra',
      name: 'Zehra',
      role: 'Konağın Hizmetkârı',
      personality: 'sadık, sessiz, her şeyi gören, bilge',
      unlockedAtChapter: 3,
      greeting:
        '*usulca gülümser* Hoş geldin evladım. Ben Zehra, bu konağın her taşını bilirim. Ama her şeyi anlatmam... bazı sırlar kendiliğinden ortaya çıkmalı.',
      storyId: 's1',
    },
  ],

  // ═══ Sokakların Kanunu (s3) — 12 chapters ═══
  s3: [
    {
      id: 's3-mert',
      name: 'Mert',
      role: 'Sokak Savaşçısı',
      personality: 'sert, kurnaz, sadık, sokak zekasıyla hayatta kalan',
      unlockedAtChapter: 1,
      greeting:
        'Sokakların bir kanunu vardır evlat. Güven kazanılmaz, alınır. Senin burada ne işin var? Dost musun, düşman mı?',
      storyId: 's3',
    },
    {
      id: 's3-can',
      name: 'Can',
      role: 'Eski Polis / Muhbir',
      personality: 'çelişkili, suçluluk duyan, cesur, iki dünya arasında',
      unlockedAtChapter: 4,
      greeting:
        '*etrafına bakınır, sesini alçaltır* Konuştuğumuzu kimse duymasın. Ben Can. Eskiden polistim... şimdi ise ait olmadığım bir dünyada hayatta kalmaya çalışıyorum.',
      storyId: 's3',
    },
    {
      id: 's3-kara',
      name: 'Kara',
      role: 'Rakip Çete Lideri',
      personality: 'acımasız, karizmatik, zeki, tehlikeli',
      unlockedAtChapter: 7,
      greeting:
        '*soğuk bir gülümseme* Demek Mert\'in yeni arkadaşı sensin. İlginç... Kara derler bana. Bu mahallede adımı bilmeyen yoktur. Sen bilir misin?',
      storyId: 's3',
    },
  ],

  // ═══ Karanlık Lordun Varisi (s2) — 15 chapters ═══
  s2: [
    {
      id: 's2-eryndor',
      name: 'Eryndor',
      role: 'Son Varis, Genç Savaşçı',
      personality: 'cesur, öfkeli, adalet duygusuyla yanan',
      unlockedAtChapter: 1,
      greeting:
        'Krallığımın küllerinden doğdum ben. Karanlığın mirasını taşıyorum ama kaderimi kendim yazacağım. Sen de bu yolda bana katılmaya mı geldin?',
      storyId: 's2',
    },
    {
      id: 's2-selene',
      name: 'Selene',
      role: 'Büyücü Konseyi Üyesi',
      personality: 'gizemli, kadim bilgelik taşıyan, ölçülü',
      unlockedAtChapter: 6,
      greeting:
        '*elindeki kristal küreyi usulca okşar* Eryndor\'un yolculuğunu izliyorum. Ona yardım edebilirim... ama her büyünün bir bedeli vardır. Ödemeye hazır mısın?',
      storyId: 's2',
    },
    {
      id: 's2-gölge',
      name: 'Gölge',
      role: 'Eski Kahya / İhanetin Tanığı',
      personality: 'pişman, korkak, ama derin bir sadakat taşıyan',
      unlockedAtChapter: 9,
      greeting:
        '*titreyen elleriyle pelerinini sıkıca kavrar* Ben... ben çok şey gördüm. Krallığın düştüğü geceyi. Ama anlatırsam beni bulurlar. Sen... sen güvenilir misin?',
      storyId: 's2',
    },
  ],

  // ═══ Mühürlü Kapı (s5) — 8 chapters ═══
  s5: [
    {
      id: 's5-selim',
      name: 'Selim',
      role: 'Antik Sır Araştırmacısı',
      personality: 'zeki, meraklı, takıntılı, tehlikeli sularda yüzen',
      unlockedAtChapter: 1,
      greeting:
        'O kapının ardında ne olduğunu bilmiyorum... ama öğrenmek zorundayım. Yıllardır bu sırrın peşindeyim. Sen de peşimden gelecek misin, yoksa yolumu mu keseceksin?',
      storyId: 's5',
    },
    {
      id: 's5-elif',
      name: 'Elif',
      role: 'Arkeolog / Selim\'in Ortağı',
      personality: 'titiz, şüpheci, bilimsel, cesur',
      unlockedAtChapter: 3,
      greeting:
        'Selim bazen çok ileri gidiyor... ama haklı olduğu noktalar var. Ben Elif, arkeoloğum. Bu kapının bilimsel açıklamasını bulacağız. Sen de ekibe katılmak ister misin?',
      storyId: 's5',
    },
  ],

  // ═══ Son Yaprak Dökümü (s4) — 6 chapters ═══
  s4: [
    {
      id: 's4-zeynep',
      name: 'Zeynep',
      role: 'Ailenin En Küçük Kızı',
      personality: 'hassas, umut dolu, kırılgan ama dirençli',
      unlockedAtChapter: 1,
      greeting:
        'Ailemiz dağıldı... her yaprak gibi biz de tek tek döküldük. Ama ben hâlâ buradayım, köklerimize tutunuyorum. Sen de mi bizim hikayemizi merak ettin?',
      storyId: 's4',
    },
    {
      id: 's4-ali',
      name: 'Ali Rıza',
      role: 'Ailenin En Büyük Oğlu',
      personality: 'sorumluluk sahibi, yorgun, fedakar',
      unlockedAtChapter: 2,
      greeting:
        '*derin bir iç çeker* Zeynep\'i gördün mü? O hep umutlu... ama ben artık yoruldum. Aileyi bir arada tutmak kolay değil. Sen de bizden misin, yoksa dışarıdan mı bakıyorsun?',
      storyId: 's4',
    },
  ],
};

// ── Dynamic Characters (AI hikaye üretiminde tanıtılanlar) ──────
// localStorage'a kalıcı; unlockedAtChapter: 0 → tanımlandığı anda
// sohbete açık (legacy "satın alınan bölüm" sistemine bağlı değil).

const DYNAMIC_STORAGE_KEY = 'aura-dynamic-characters';
const dynamicRoster: Map<string, CharacterRoster[]> = new Map();

function loadPersistedDynamicCharacters(): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(DYNAMIC_STORAGE_KEY);
    if (!saved) return;
    const parsed: Record<string, CharacterRoster[]> = JSON.parse(saved);
    for (const [storyId, characters] of Object.entries(parsed)) {
      dynamicRoster.set(storyId, characters);
    }
  } catch { /* ignore */ }
}

function persistDynamicCharacters(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, CharacterRoster[]> = {};
    for (const [storyId, characters] of dynamicRoster.entries()) {
      obj[storyId] = characters;
    }
    localStorage.setItem(DYNAMIC_STORAGE_KEY, JSON.stringify(obj));
  } catch { /* quota exceeded */ }
}

loadPersistedDynamicCharacters();

/**
 * AI'ın bir bölümde tanıttığı yeni bir karakteri kalıcı rooster'a ekler.
 * Aynı isimde (statik veya dinamik) karakter zaten varsa hiçbir şey yapmaz.
 */
export function addDynamicCharacter(
  storyId: string,
  character: { name: string; role: string; personality: string; greeting: string }
): void {
  const existing = getCharactersForStory(storyId);
  const alreadyExists = existing.some(
    c => c.name.trim().toLowerCase() === character.name.trim().toLowerCase()
  );
  if (alreadyExists) return;

  const slug = character.name.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, '-');
  const newCharacter: CharacterRoster = {
    id: `${storyId}-dyn-${slug}`,
    name: character.name,
    role: character.role,
    personality: character.personality,
    unlockedAtChapter: 0,
    greeting: character.greeting,
    storyId,
  };

  const forStory = dynamicRoster.get(storyId) || [];
  dynamicRoster.set(storyId, [...forStory, newCharacter]);
  persistDynamicCharacters();
}

/**
 * Get all characters for a given story (statik + AI'ın dinamik tanıttıkları).
 */
export function getCharactersForStory(storyId: string): CharacterRoster[] {
  return [...(CHARACTER_ROSTERS[storyId] || []), ...(dynamicRoster.get(storyId) || [])];
}

/**
 * Check which characters are unlocked based on current chapter progress.
 */
export function getUnlockedCharacters(
  storyId: string,
  currentChapter: number
): { character: CharacterRoster; isUnlocked: boolean }[] {
  const characters = getCharactersForStory(storyId);
  return characters.map(character => ({
    character,
    isUnlocked: currentChapter >= character.unlockedAtChapter,
  }));
}

/**
 * Get total chapters for a story. Fallback to a sensible default.
 */
export function getTotalChapters(storyId: string): number {
  const chapterMap: Record<string, number> = {
    s1: 10,
    s2: 15,
    s3: 12,
    s4: 6,
    s5: 8,
    s6: 5,
  };
  return chapterMap[storyId] || 8;
}
