/**
 * Story Bible — kullanıcı+hikâye başına kalıcı, sunucu-yetkili anlatı defteri.
 *
 * Firestore yolu: users/{uid}/storyBibles/{storyId}
 *
 * YALNIZCA Admin SDK (functions) yazar; istemci bu dokümanı okumaz/yazmaz,
 * bu nedenle bu milestone için Firestore rules değişikliği gerekmez.
 *
 * Otorite sırası: YERLEŞİK KANON > World State > Kader > Bölüm sürekliliği >
 * StoryBrain yönlendirmesi. mergeStoryBibleGuidance kanonun yönlendirmeyi
 * ezmesini sağlar.
 *
 * Saf reducer (reduceStoryBible) Firestore'dan bağımsız tutulur, böylece
 * davranış unit test ile doğrulanabilir.
 */
import { getFirestore } from 'firebase-admin/firestore';
import type { ChosenFate } from './types';
import type { StoryBrainProfile } from './storybrain/story-brain';
import { formatStoryBrainForBible } from './storybrain/story-brain';
import storybrainSeedV1 from './storybrain/storybrain-seed.v1.json';

export type BibleEntryKind = 'fact' | 'thread' | 'fate' | 'guidance' | 'authorial';
export type BibleEntrySource = 'chapter' | 'fate' | 'world_state' | 'storybrain';
export type BibleEntryStatus = 'canon' | 'draft' | 'resolved' | 'superseded';

export interface StoryBibleEntry {
  id: string;
  kind: BibleEntryKind;
  text: string;
  chapterNumber: number;
  revision: number;
  createdAt: number;
  source: BibleEntrySource;
  status: BibleEntryStatus;
  origin?: string;
}

export interface StoryBible {
  version: 1;
  storyId: string;
  revision: number;
  entries: StoryBibleEntry[];
  establishedFacts: StoryBibleEntry[];
  fateHistory: StoryBibleEntry[];
  guidance: string[];
  openThreads: StoryBibleEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface BibleEntryDraft {
  kind: BibleEntryKind;
  text: string;
  source: BibleEntrySource;
  status: BibleEntryStatus;
  origin?: string;
  bucket: 'establishedFacts' | 'fateHistory' | 'openThreads' | 'entries';
}

const MAX_ENTRIES = 500;
const MAX_FATE_HISTORY = 200;
const MAX_THREADS = 200;

const genreVocab = new Set(
  Object.keys(
    (storybrainSeedV1 as unknown as { tokenFrequencies: Record<string, Record<string, number>> })
      .tokenFrequencies.genre || {},
  ).map(g => g.toLocaleLowerCase('tr-TR')),
);

export function createEmptyStoryBible(storyId: string): StoryBible {
  return {
    version: 1,
    storyId,
    revision: 0,
    entries: [],
    establishedFacts: [],
    fateHistory: [],
    guidance: [],
    openThreads: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

/**
 * Saf reducer. Draft listesini giriş olarak alır, monotonic revision ile yeni
 * girdiler ekler ve ilgili türetilmiş kovaya yönlendirir.
 */
export function reduceStoryBible(
  previous: StoryBible,
  drafts: BibleEntryDraft[],
  chapterNumber: number,
  now = Date.now(),
): StoryBible {
  const revision = previous.revision + 1;
  const entries = previous.entries.slice();
  const establishedFacts = previous.establishedFacts.slice();
  const fateHistory = previous.fateHistory.slice();
  const openThreads = previous.openThreads.slice();

  drafts.forEach((draft, index) => {
    const entry: StoryBibleEntry = {
      id: `${revision}-${index + 1}`,
      kind: draft.kind,
      text: draft.text,
      chapterNumber,
      revision,
      createdAt: now,
      source: draft.source,
      status: draft.status,
      origin: draft.origin,
    };
    entries.push(entry);
    if (draft.bucket === 'establishedFacts') establishedFacts.push(entry);
    else if (draft.bucket === 'fateHistory') fateHistory.push(entry);
    else if (draft.bucket === 'openThreads') openThreads.push(entry);
  });

  return {
    ...previous,
    revision,
    entries: entries.slice(-MAX_ENTRIES),
    establishedFacts,
    fateHistory: fateHistory.slice(-MAX_FATE_HISTORY),
    openThreads: openThreads.slice(-MAX_THREADS),
    updatedAt: now,
  };
}

/** Yerleşik (kanon) gerçeklerden tür etiketlerini çıkarır (küçük harf). */
function extractEstablishedGenres(facts: StoryBibleEntry[]): string[] {
  const found = new Set<string>();
  for (const fact of facts) {
    const tokens = fact.text.toLocaleLowerCase('tr-TR').split(/[^a-zçğıöşü]+/).filter(Boolean);
    for (const token of tokens) {
      if (genreVocab.has(token)) found.add(token);
    }
  }
  return [...found];
}

/**
 * StoryBrain yönlendirmesini deftere ekler; kanon > guidance. Yerleşik tür
 * tamamen farklı bir yön öneriyorsa yönlendirme bloğu reddedilir.
 */
export function mergeStoryBibleGuidance(
  bible: StoryBible,
  profile: StoryBrainProfile,
): StoryBible {
  const establishedGenres = extractEstablishedGenres(bible.establishedFacts);
  let block = formatStoryBrainForBible(profile);
  if (establishedGenres.length > 0) {
    const suggested = new Set(profile.genres.map(g => g.toLocaleLowerCase('tr-TR')));
    const anyOverlap = establishedGenres.some(genre => suggested.has(genre));
    if (!anyOverlap) {
      block = 'STORY BRAIN — YÖNLENDİRME (KANON DEĞİL)\n(Reddedildi: yerleşik türle çelişiyor.)';
    }
  }
  return { ...bible, guidance: [block] };
}

/** Prompt'a girecek Türkçe bağlam; otorite sırasıyla düzenlenir. */
export function formatStoryBibleForPrompt(bible: StoryBible): string {
  const lines: string[] = [];
  if (bible.establishedFacts.length > 0) {
    lines.push('YERLEŞİK GERÇEKLER (KANON)');
    for (const fact of bible.establishedFacts) lines.push(`- ${fact.text}`);
  }
  if (bible.fateHistory.length > 0) {
    lines.push('KADER GEÇMİŞİ');
    for (const fate of bible.fateHistory.slice(-12)) {
      lines.push(`- Bölüm ${fate.chapterNumber}: ${fate.text}${fate.origin ? ` [${fate.origin}]` : ''}`);
    }
  }
  if (bible.openThreads.length > 0) {
    lines.push('AÇIK UÇLAR');
    for (const thread of bible.openThreads.slice(-10)) {
      lines.push(`- Bölüm ${thread.chapterNumber}: ${thread.text}`);
    }
  }
  if (bible.guidance.length > 0) {
    lines.push(bible.guidance.join('\n'));
  }
  return lines.join('\n');
}

/**
 * Idempotent yükle/oluştur. Doküman yoksa ya da şema/sürüm uyuşmazsa boş defter
 * oluşturup (merge:false) yazar; aksi halde savunmacı varsayılanlarla geri döner.
 */
export async function loadOrCreateStoryBible(
  uid: string,
  storyId: string,
): Promise<StoryBible> {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('storyBibles').doc(storyId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const created = createEmptyStoryBible(storyId);
    created.createdAt = Date.now();
    created.updatedAt = created.createdAt;
    await ref.set(created, { merge: false });
    return created;
  }

  const data = snapshot.data() as Partial<StoryBible> | undefined;
  if (!data || data.version !== 1 || data.storyId !== storyId) {
    const created = createEmptyStoryBible(storyId);
    created.createdAt = Date.now();
    created.updatedAt = created.createdAt;
    await ref.set(created, { merge: false });
    return created;
  }

  return {
    ...createEmptyStoryBible(storyId),
    ...data,
    entries: Array.isArray(data.entries) ? data.entries.slice(-MAX_ENTRIES) : [],
    establishedFacts: Array.isArray(data.establishedFacts) ? data.establishedFacts : [],
    fateHistory: Array.isArray(data.fateHistory) ? data.fateHistory.slice(-MAX_FATE_HISTORY) : [],
    guidance: Array.isArray(data.guidance) ? data.guidance : [],
    openThreads: Array.isArray(data.openThreads) ? data.openThreads.slice(-MAX_THREADS) : [],
  } as StoryBible;
}

export async function updateStoryBible(
  uid: string,
  storyId: string,
  next: StoryBible,
): Promise<StoryBible> {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('storyBibles').doc(storyId);
  await ref.set(next, { merge: false });
  return next;
}

/**
 * Kader + bölüm girdilerinden saf defter draft'larını üretir. Firestore'dan
 * bağımsız olduğu için unit test ile doğrulanabilir.
 */
export function buildChapterBibleDrafts(
  input: { chosenFate: ChosenFate; chapterNumber: number },
  output: { title: string },
): BibleEntryDraft[] {
  const drafts: BibleEntryDraft[] = [];
  if (input.chosenFate && input.chosenFate.text) {
    drafts.push({
      kind: 'fate',
      text: input.chosenFate.text,
      source: 'fate',
      status: 'canon',
      origin: input.chosenFate.isForceChoice ? 'force' : `choice-${input.chosenFate.option}`,
      bucket: 'fateHistory',
    });
  }
  if (output && output.title) {
    drafts.push({
      kind: 'thread',
      text: output.title,
      source: 'chapter',
      status: 'draft',
      bucket: 'openThreads',
    });
  }
  return drafts;
}

/**
 * Üretilen bölümden kader seçimini ve bölüm başlığını deftere işler.
 * Arayan (generateStory) fail-open ile çağırır — defter hatası ücretli bölümü
 * ASLA düşürmez. Ledger idempotency'si yinelenen işlemleri zaten engeller.
 */
export async function recordStoryBibleFromChapter(
  uid: string,
  storyId: string,
  input: { chosenFate: ChosenFate; chapterNumber: number },
  output: { title: string },
): Promise<StoryBible> {
  const bible = await loadOrCreateStoryBible(uid, storyId);
  const drafts = buildChapterBibleDrafts(input, output);
  if (drafts.length === 0) return bible;
  const next = reduceStoryBible(bible, drafts, input.chapterNumber);
  return updateStoryBible(uid, storyId, next);
}
