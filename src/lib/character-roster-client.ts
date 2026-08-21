'use client';

import { callGenerateCharacterRoster } from '@/lib/functions-client';
import type {
  CharacterRoster,
  DynamicCharacterRosterInput,
  DynamicCharacterRosterResult,
} from '@/lib/types';

const CACHE_PREFIX = 'aura-character-roster-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedRoster {
  savedAt: number;
  result: DynamicCharacterRosterResult;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function cacheKey(input: DynamicCharacterRosterInput): string {
  const lastChapter = input.chapters[input.chapters.length - 1]?.chapterNumber || 0;
  return `${CACHE_PREFIX}:${input.storyId}:${input.currentChapter}:${lastChapter}`;
}

function isValidCharacter(value: unknown): value is CharacterRoster {
  if (!value || typeof value !== 'object') return false;
  const character = value as Record<string, unknown>;
  return (
    typeof character.id === 'string' && Boolean(character.id) &&
    typeof character.name === 'string' && Boolean(character.name.trim()) &&
    typeof character.role === 'string' && Boolean(character.role.trim()) &&
    typeof character.personality === 'string' && Boolean(character.personality.trim()) &&
    typeof character.greeting === 'string' && Boolean(character.greeting.trim()) &&
    typeof character.storyId === 'string' && Boolean(character.storyId) &&
    typeof character.unlockedAtChapter === 'number' &&
    Number.isFinite(character.unlockedAtChapter)
  );
}

function sanitizeResult(
  input: DynamicCharacterRosterInput,
  result: DynamicCharacterRosterResult,
): DynamicCharacterRosterResult {
  const seen = new Set<string>();
  const characters = (result.characters || [])
    .filter(isValidCharacter)
    .filter(character => character.storyId === input.storyId)
    .filter(character => {
      const key = normalizeName(character.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(character => ({
      ...character,
      unlockedAtChapter: Math.max(1, Math.min(input.currentChapter, Math.round(character.unlockedAtChapter))),
    }))
    .slice(0, 6);

  if (characters.length === 0) {
    throw new Error('Karakter Odası için geçerli karakter bulunamadı.');
  }

  return {
    characters,
    sourceRevision: result.sourceRevision || `chapter-${input.currentChapter}`,
  };
}

function readCache(input: DynamicCharacterRosterInput): DynamicCharacterRosterResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(input));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRoster;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return sanitizeResult(input, parsed.result);
  } catch {
    return null;
  }
}

function writeCache(input: DynamicCharacterRosterInput, result: DynamicCharacterRosterResult): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedRoster = { savedAt: Date.now(), result };
    window.localStorage.setItem(cacheKey(input), JSON.stringify(payload));
    // Karakter sohbetinin kanonik profile erişmesi için hikâye bazlı son sonucu da tut.
    window.localStorage.setItem(`${CACHE_PREFIX}:latest:${input.storyId}`, JSON.stringify(payload));
  } catch {
    // Cache yardımcıdır; storage kotası ana özelliği bozmasın.
  }
}

export async function loadDynamicCharacterRoster(
  input: DynamicCharacterRosterInput,
): Promise<DynamicCharacterRosterResult> {
  const cached = readCache(input);
  if (cached) return cached;

  const result = sanitizeResult(input, await callGenerateCharacterRoster(input));
  writeCache(input, result);
  return result;
}

export function findCachedDynamicCharacter(
  storyId: string,
  characterName: string,
): CharacterRoster | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:latest:${storyId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRoster;
    if (!parsed?.result?.characters) return null;
    const target = normalizeName(characterName);
    return parsed.result.characters.find(character => normalizeName(character.name) === target) || null;
  } catch {
    return null;
  }
}

/**
 * Static roster yayıncı tarafından küratörlü kaynaktır ve aynı isimdeki AI
 * profile göre önceliklidir. AI yalnızca yeni ortaya çıkan karakterleri ekler.
 */
export function mergeCharacterRosters(
  staticCharacters: CharacterRoster[],
  dynamicCharacters: CharacterRoster[],
): CharacterRoster[] {
  const merged = new Map<string, CharacterRoster>();

  for (const character of staticCharacters) {
    merged.set(normalizeName(character.name), character);
  }
  for (const character of dynamicCharacters) {
    const key = normalizeName(character.name);
    if (!merged.has(key)) merged.set(key, character);
  }

  return Array.from(merged.values())
    .sort((a, b) => a.unlockedAtChapter - b.unlockedAtChapter || a.name.localeCompare(b.name, 'tr'))
    .slice(0, 8);
}
