/**
 * StoryBrain — deterministik, sunucu-yetkili anlatı profili üretici.
 *
 * Yalnızca commit edilen `storybrain-seed.v1.json` (kaynak-nötr agrega) kullanır.
 * Aynı (uid, storyId, version) girdisi daima aynı profili üretir; profil istemci
 * tarafından değiştirilemez. storyTitle/genreHint yalnızca ağırlığı kaydırır,
 * RNG çekiş sırasını değiştirmez (profil kararlılığı korunur).
 *
 * Derecelendirme otoritesi: bu profil EN ALT otoritedir; yerleşik gerçekler,
 * World State, kader kararı ve bölüm sürekliliği üstündedir.
 */
import { createHash } from 'node:crypto';
import storybrainSeedV1 from './storybrain-seed.v1.json';
import type { SeedProfile, StoryBrainSeed } from './seed-types';

export const STORY_BRAIN_VERSION = 1;

const DIVERSITY_PENALTY = 0.6;
const SOURCE_PROFILE_SAMPLE = 3;
const GENRE_HINT_BONUS = 10;
const TROPE_HINT_BONUS = 6;

export interface StoryBrainSynthInput {
  uid: string;
  storyId: string;
  /** Yumuşak yönlendirme — determinizm anahtarının PARÇASI DEĞİL. */
  storyTitle?: string;
  /** Yumuşak yönlendirme — tür etiketlerini eşleştirir. */
  genreHint?: string[];
  /** STORY_BRAIN_VERSION'a eşit olmalı. */
  version?: number;
}

export interface StoryBrainProfile {
  version: number;
  source: 'storybrain-v1';
  genres: string[];
  subgenres: string[];
  tropes: string[];
  protagonist: { archetype: string; role: string; primaryGoalType: string };
  counterpart: { archetype: string; role: string; powerPosition: string };
  relationshipDynamic: string[];
  powerDynamics: string[];
  settings: string[];
  tone: string[];
  themes: string[];
  incitingIncident: string;
  centralConflict: string;
  stakes: string[];
  goals: string[];
  obstacles: string[];
  romancePattern?: string;
  hook: string;
  emotionalDrivers: string[];
  twistPatterns: string[];
  cliffhanger: string[];
  confidence: { overall: number; genre: number; tropes: number };
}

const seed = storybrainSeedV1 as unknown as StoryBrainSeed;

/** uint32(sha256(`${version}|${uid}|${storyId}`)) — deterministik RNG tohumu. */
export function hashStoryBrainSeed(uid: string, storyId: string, version: number): number {
  return createHash('sha256').update(`${version}|${uid}|${storyId}`).digest().readUInt32LE(0);
}

/** Saf, deterministik PRNG (mulberry32). */
export function mulberry32(seedValue: number): () => number {
  let a = seedValue >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSourceProfiles(rng: () => number, pool: SeedProfile[], n: number): SeedProfile[] {
  if (pool.length === 0) return [];
  const count = Math.min(n, pool.length);
  const remaining = pool.map((_, i) => i);
  const indices: number[] = [];
  for (let k = 0; k < count; k += 1) {
    const idx = Math.floor(rng() * remaining.length) % remaining.length;
    indices.push(remaining.splice(idx, 1)[0]!);
  }
  return indices.map(i => pool[i]!);
}

interface MultiConfig {
  out: keyof StoryBrainProfile;
  seedField: string;
  count: number;
  kind: 'array';
}

const MULTI_FIELDS: MultiConfig[] = [
  { out: 'genres', seedField: 'genre', count: 2, kind: 'array' },
  { out: 'subgenres', seedField: 'subgenres', count: 2, kind: 'array' },
  { out: 'tropes', seedField: 'tropes', count: 3, kind: 'array' },
  { out: 'relationshipDynamic', seedField: 'relationshipDynamic', count: 2, kind: 'array' },
  { out: 'powerDynamics', seedField: 'powerDynamics', count: 2, kind: 'array' },
  { out: 'settings', seedField: 'setting', count: 2, kind: 'array' },
  { out: 'tone', seedField: 'tone', count: 2, kind: 'array' },
  { out: 'themes', seedField: 'themes', count: 2, kind: 'array' },
  { out: 'stakes', seedField: 'stakes', count: 3, kind: 'array' },
  { out: 'goals', seedField: 'goals', count: 2, kind: 'array' },
  { out: 'obstacles', seedField: 'obstacles', count: 2, kind: 'array' },
  { out: 'emotionalDrivers', seedField: 'emotionalDrivers', count: 3, kind: 'array' },
  { out: 'twistPatterns', seedField: 'twistPatterns', count: 2, kind: 'array' },
  { out: 'cliffhanger', seedField: 'cliffhangerPotential', count: 2, kind: 'array' },
];

interface SingleConfig {
  out: string; // dotted path or top-level key
  seedField: string;
  nullable?: boolean;
}

const SINGLE_FIELDS: SingleConfig[] = [
  { out: 'protagonist.archetype', seedField: 'protagonistArchetype' },
  { out: 'protagonist.role', seedField: 'protagonistRole' },
  { out: 'protagonist.primaryGoalType', seedField: 'protagonistGoalType' },
  { out: 'counterpart.archetype', seedField: 'counterpartArchetype' },
  { out: 'counterpart.role', seedField: 'counterpartRole' },
  { out: 'counterpart.powerPosition', seedField: 'counterpartPowerPosition' },
  { out: 'incitingIncident', seedField: 'incitingIncidentType' },
  { out: 'centralConflict', seedField: 'centralConflictType' },
  { out: 'romancePattern', seedField: 'romancePattern', nullable: true },
  { out: 'hook', seedField: 'hookType' },
];

/** Ağırlıklı, deterministik seçim (her seçim için tam 1 RNG çağrısı). */
function weightedPick<T>(candidates: Array<{ token: T; weight: number }>, rng: () => number): T {
  const total = candidates.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  if (total <= 0) return candidates[candidates.length - 1]!.token;
  let r = rng() * total;
  for (const c of candidates) {
    r -= Math.max(0, c.weight);
    if (r <= 0) return c.token;
  }
  return candidates[candidates.length - 1]!.token;
}

/** Alan içinde tekrarsız N token seçer; profil genelinde benzer seçimleri cezalandırır. */
function selectDistinct(
  candidates: Array<{ token: string; weight: number }>,
  count: number,
  rng: () => number,
  alreadySelected: Set<string>,
): string[] {
  const pool = candidates.map(c => ({ token: c.token, weight: c.weight }));
  const out: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    for (const c of pool) {
      if (alreadySelected.has(c.token)) c.weight *= 1 - DIVERSITY_PENALTY;
    }
    const pick = weightedPick(pool, rng);
    out.push(pick);
    alreadySelected.add(pick);
    const idx = pool.findIndex(c => c.token === pick);
    pool.splice(idx, 1);
  }
  return out;
}

function buildInvalidByField(): Map<string, Array<[string, string]>> {
  const map = new Map<string, Array<[string, string]>>();
  for (const [a, b] of seed.invalidCombinations) {
    const [fa, ta] = splitInvalid(a);
    const [fb, tb] = splitInvalid(b);
    if (fa !== fb) continue;
    if (!map.has(fa)) map.set(fa, []);
    map.get(fa)!.push([ta, tb]);
  }
  return map;
}

function splitInvalid(pair: string): [string, string] {
  const colon = pair.indexOf(':');
  if (colon < 0) return ['', pair];
  return [pair.slice(0, colon), pair.slice(colon + 1)];
}

function globalFreq(seedField: string, token: string): number {
  const table = seed.tokenFrequencies[seedField];
  return table ? (table[token] || 0) : 0;
}

/**
 * Kalıp tamamlandıktan sonra aynı alan içinde yasaklı çift varsa düşük ağırlıklı
 * üyeyi çıkarır. invalidCombinations yalnızca korpusta hiç birlikte geçmemiş
 * çiftleri içerdiği için kaynak-nötr ve deterministiktir.
 */
function filterFieldInvalid(
  selected: string[],
  seedField: string,
  invalidByField: Map<string, Array<[string, string]>>,
): string[] {
  const pairs = invalidByField.get(seedField);
  if (!pairs) return selected;
  const result = selected.slice();
  let guard = 0;
  for (const [a, b] of pairs) {
    const ia = result.indexOf(a);
    const ib = result.indexOf(b);
    if (ia >= 0 && ib >= 0) {
      const drop = globalFreq(seedField, a) <= globalFreq(seedField, b) ? ia : ib;
      result.splice(drop, 1);
      guard += 1;
      if (guard > 200) break;
    }
  }
  return result;
}

export function synthesizeStoryBrain(input: StoryBrainSynthInput): StoryBrainProfile {
  const version = input.version ?? STORY_BRAIN_VERSION;
  const rng = mulberry32(hashStoryBrainSeed(input.uid, input.storyId, version));
  const pool = seed.profilePool;
  const selected = pickSourceProfiles(rng, pool, SOURCE_PROFILE_SAMPLE);

  const hintTokens = new Set((input.genreHint || []).map(t => t.trim()).filter(Boolean));
  const alreadySelected = new Set<string>();
  const invalidByField = buildInvalidByField();

  const profile: StoryBrainProfile = {
    version,
    source: 'storybrain-v1',
    genres: [],
    subgenres: [],
    tropes: [],
    protagonist: { archetype: '', role: '', primaryGoalType: '' },
    counterpart: { archetype: '', role: '', powerPosition: '' },
    relationshipDynamic: [],
    powerDynamics: [],
    settings: [],
    tone: [],
    themes: [],
    incitingIncident: '',
    centralConflict: '',
    stakes: [],
    goals: [],
    obstacles: [],
    romancePattern: undefined,
    hook: '',
    emotionalDrivers: [],
    twistPatterns: [],
    cliffhanger: [],
    confidence: { overall: 0, genre: 0, tropes: 0 },
  };

  const arrayField = (seedField: string): string[] => {
    const out: string[] = [];
    for (const p of selected) {
      const value = (p.tokens as unknown as Record<string, unknown>)[seedField];
      if (Array.isArray(value)) out.push(...(value as string[]));
    }
    return out;
  };
  const singleField = (seedField: string): string[] => {
    const out: string[] = [];
    for (const p of selected) {
      const value = (p.tokens as unknown as Record<string, string>)[seedField];
      if (value) out.push(value);
    }
    return out;
  };

  const hintBonus = (seedField: string, token: string): number => {
    if (!hintTokens.has(token)) return 0;
    return seedField === 'genre' ? GENRE_HINT_BONUS : TROPE_HINT_BONUS;
  };

  for (const config of MULTI_FIELDS) {
    const sourceTokens = arrayField(config.seedField);
    const counts = new Map<string, number>();
    for (const t of sourceTokens) if (t) counts.set(t, (counts.get(t) || 0) + 1);
    const candidates = [...counts.entries()].map(([token, weight]) => ({
      token,
      weight: weight + hintBonus(config.seedField, token),
    }));
    let chosen = selectDistinct(candidates, config.count, rng, alreadySelected);
    chosen = filterFieldInvalid(chosen, config.seedField, invalidByField);
    (profile[config.out] as unknown as string[]) = chosen;
  }

  for (const config of SINGLE_FIELDS) {
    const candidates = [...new Set(singleField(config.seedField))].map(token => ({
      token,
      weight: 1 + hintBonus(config.seedField, token),
    }));
    if (candidates.length === 0) {
      if (config.nullable) continue;
      continue;
    }
    const chosen = weightedPick(candidates, rng);
    if (config.out.includes('.')) {
      const [obj, key] = config.out.split('.') as [keyof StoryBrainProfile, string];
      (profile[obj] as unknown as Record<string, string>)[key] = chosen;
    } else {
      (profile as unknown as Record<string, string>)[config.out] = chosen;
    }
  }

  // Güven skorları: seçilen kaynak profillerin ortalaması (yalnızca agrega).
  const avg = (key: 'overall' | 'genre' | 'tropes') => {
    if (selected.length === 0) return 0;
    const sum = selected.reduce((acc, p) => acc + (p.confidence[key] || 0), 0);
    return Math.round((sum / selected.length) * 100) / 100;
  };
  profile.confidence = { overall: avg('overall'), genre: avg('genre'), tropes: avg('tropes') };

  return profile;
}

/** Story Bible'a girecek Türkçe yönlendirme bloğu — açıkça KANON DEĞİL. */
export function formatStoryBrainForBible(profile: StoryBrainProfile): string {
  const list = (values: string[]) => values.join(', ') || '(belirlenmedi)';
  return `STORY BRAIN — YÖNLENDİRME (KANON DEĞİL)
Önerilen türler: ${list(profile.genres)}
Alt türler: ${list(profile.subgenres)}
Kalıplar: ${list(profile.tropes)}
İlişki dinamiği: ${list(profile.relationshipDynamic)}
Güç dinamikleri: ${list(profile.powerDynamics)}
Ton: ${list(profile.tone)}
Temalar: ${list(profile.themes)}
Merkezi çatışma: ${profile.centralConflict || '(belirlenmedi)'}
Başlangıç kancası: ${profile.hook || '(belirlenmedi)'}
Not: Bu yönlendirme en alt otoritedir; yerleşik gerçekler, World State, kader kararı ve bölüm sürekliliği üstündür. Çelişirse bu blok yok sayılır.`;
}
