import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeStoryBrain } from './story-brain';
import storybrainSeedV1 from './storybrain-seed.v1.json';

const STORY_IDS = Array.from({ length: 40 }, (_, i) => `s${i}`);

test('synthesizeStoryBrain is deterministic given (uid, storyId, version)', () => {
  const a = synthesizeStoryBrain({ uid: 'u1', storyId: 's1' });
  const b = synthesizeStoryBrain({ uid: 'u1', storyId: 's1' });
  assert.deepEqual(a, b);
});

test('changing uid or version changes the profile', () => {
  const base = synthesizeStoryBrain({ uid: 'u1', storyId: 's1' });
  const otherUid = synthesizeStoryBrain({ uid: 'u2', storyId: 's1' });
  assert.notEqual(JSON.stringify(base), JSON.stringify(otherUid));
  const otherVersion = synthesizeStoryBrain({ uid: 'u1', storyId: 's1', version: 2 });
  assert.notEqual(JSON.stringify(base), JSON.stringify(otherVersion));
});

test('genreHint never decreases the hinted genre presence (monotonic bias)', () => {
  let neutral = 0;
  let hinted = 0;
  for (const id of STORY_IDS) {
    const plain = synthesizeStoryBrain({ uid: 'mono', storyId: id });
    const withHint = synthesizeStoryBrain({ uid: 'mono', storyId: id, genreHint: ['Mafya'] });
    if (plain.genres.includes('Mafya')) neutral += 1;
    if (withHint.genres.includes('Mafya')) hinted += 1;
  }
  // Bonus yalnızca ağırlık eklediği için Mafya'nın seçilme olasılığı azalamaz.
  assert.ok(hinted >= neutral, `hinted ${hinted} should be >= neutral ${neutral}`);
});

test('invalid-combination filter leaves no forbidden pair in any sampled profile', () => {
  const invalid = (storybrainSeedV1 as unknown as { invalidCombinations: Array<[string, string]> })
    .invalidCombinations;
  const forbiddenByField = new Map<string, Set<string>>();
  for (const [a, b] of invalid) {
    const ca = a.indexOf(':');
    const cb = b.indexOf(':');
    if (ca < 0 || cb < 0) continue;
    const fa = a.slice(0, ca);
    const fb = b.slice(0, cb);
    if (fa !== fb) continue;
    if (!forbiddenByField.has(fa)) forbiddenByField.set(fa, new Set());
    forbiddenByField.get(fa)!.add(`${a.slice(ca + 1)}|${b.slice(cb + 1)}`);
  }
  const fieldMap: Record<string, string> = {
    genres: 'genre',
    subgenres: 'subgenres',
    tropes: 'tropes',
    relationshipDynamic: 'relationshipDynamic',
    powerDynamics: 'powerDynamics',
    settings: 'setting',
    tone: 'tone',
    themes: 'themes',
  };
  for (const id of STORY_IDS) {
    const profile = synthesizeStoryBrain({ uid: 'filter', storyId: id });
    for (const [out, seedField] of Object.entries(fieldMap)) {
      const forbidden = forbiddenByField.get(seedField);
      if (!forbidden) continue;
      const arr = profile[out as keyof typeof profile] as string[];
      for (let i = 0; i < arr.length; i += 1) {
        for (let j = i + 1; j < arr.length; j += 1) {
          const x = arr[i]!;
          const y = arr[j]!;
          assert.ok(
            !forbidden.has(`${x}|${y}`) && !forbidden.has(`${y}|${x}`),
            `forbidden pair survived in ${out}: ${x}, ${y}`,
          );
        }
      }
    }
  }
});

test('diversity keeps field tokens distinct across repeated draws', () => {
  const multi = ['genres', 'subgenres', 'tropes', 'relationshipDynamic', 'powerDynamics', 'settings', 'tone', 'themes', 'stakes', 'goals', 'obstacles', 'emotionalDrivers', 'twistPatterns', 'cliffhanger'] as const;
  for (const id of STORY_IDS) {
    const profile = synthesizeStoryBrain({ uid: 'diversity', storyId: id });
    for (const field of multi) {
      const arr = profile[field] as unknown as string[];
      assert.equal(new Set(arr).size, arr.length, `duplicate in ${field} for ${id}`);
    }
  }
});
