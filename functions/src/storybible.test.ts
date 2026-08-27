import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyStoryBible,
  reduceStoryBible,
  mergeStoryBibleGuidance,
  formatStoryBibleForPrompt,
} from './storybible';
import { synthesizeStoryBrain } from './storybrain/story-brain';
import type { StoryBibleEntry } from './storybible';
import type { StoryBrainProfile } from './storybrain/story-brain';

function factEntry(text: string): StoryBibleEntry {
  return {
    id: '0-1',
    kind: 'fact',
    text,
    chapterNumber: 1,
    revision: 0,
    createdAt: 0,
    source: 'world_state',
    status: 'canon',
  };
}

test('reduceStoryBible appends entries with monotonic revision and keeps version 1', () => {
  let bible = createEmptyStoryBible('s1');
  bible = reduceStoryBible(
    bible,
    [{ kind: 'fate', text: 'Kapıyı aç', source: 'fate', status: 'canon', origin: 'choice-A', bucket: 'fateHistory' }],
    3,
    1000,
  );
  bible = reduceStoryBible(
    bible,
    [{ kind: 'thread', text: 'Sır Odası', source: 'chapter', status: 'draft', bucket: 'openThreads' }],
    4,
    2000,
  );

  assert.equal(bible.version, 1);
  assert.equal(bible.revision, 2);
  assert.equal(bible.entries.length, 2);
  assert.equal(bible.entries[0]?.revision, 1);
  assert.equal(bible.entries[1]?.revision, 2);
  assert.notEqual(bible.entries[0]?.id, bible.entries[1]?.id);
  assert.equal(bible.fateHistory.length, 1);
  assert.equal(bible.fateHistory[0]?.origin, 'choice-A');
  assert.equal(bible.openThreads.length, 1);
  assert.equal(bible.openThreads[0]?.text, 'Sır Odası');
});

function fakeProfile(genres: string[]): StoryBrainProfile {
  return {
    version: 1,
    source: 'storybrain-v1',
    genres,
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
}

test('mergeStoryBibleGuidance drops guidance that contradicts an established genre (canon > guidance)', () => {
  const bible = createEmptyStoryBible('s1');
  bible.establishedFacts.push(factEntry('Bu hikâye Mafya türündedir.'));

  const rejected = mergeStoryBibleGuidance(bible, fakeProfile(['Romantik']));
  assert.match(rejected.guidance[0] ?? '', /Reddedildi/);
  assert.doesNotMatch(rejected.guidance[0] ?? '', /Önerilen türler: Romantik/);

  const kept = mergeStoryBibleGuidance(bible, fakeProfile(['Mafya', 'Romantik']));
  assert.match(kept.guidance[0] ?? '', /Önerilen türler/);
  assert.doesNotMatch(kept.guidance[0] ?? '', /Reddedildi/);
});

test('formatStoryBibleForPrompt orders canon > fate > open threads > storybrain guidance', () => {
  const bible = createEmptyStoryBible('s1');
  // Kanon dışı bir gerçek (tür etiketi değil) — yönlendirme korunur.
  bible.establishedFacts.push(factEntry('Katılımcının adı Kemal’dir.'));
  bible.fateHistory.push({
    id: '2-1', kind: 'fate', text: 'Kapıyı aç', chapterNumber: 2, revision: 2,
    createdAt: 0, source: 'fate', status: 'canon', origin: 'choice-A',
  });
  bible.openThreads.push({
    id: '3-1', kind: 'thread', text: 'Sır Odası', chapterNumber: 2, revision: 3,
    createdAt: 0, source: 'chapter', status: 'draft',
  });

  const profile = synthesizeStoryBrain({ uid: 'u1', storyId: 's1' });
  const withGuidance = mergeStoryBibleGuidance(bible, profile);
  const text = formatStoryBibleForPrompt(withGuidance);

  const iFacts = text.indexOf('YERLEŞİK GERÇEKLER');
  const iFate = text.indexOf('KADER GEÇMİŞİ');
  const iThread = text.indexOf('AÇIK UÇLAR');
  const iBrain = text.indexOf('STORY BRAIN');
  assert.ok(iFacts >= 0 && iFate >= 0 && iThread >= 0 && iBrain >= 0, 'all sections present');
  assert.ok(iFacts < iFate && iFate < iThread && iThread < iBrain, 'authority order preserved');
  assert.match(text, /Çelişirse/);
  assert.match(text, /Kapıyı aç/);
  assert.match(text, /Sır Odası/);
});
