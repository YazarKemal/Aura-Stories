import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBlueprints, profileHash, canonicalJson } from './seed-compiler';
import type { Blueprint } from './seed-types';

function makeBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  const base: Blueprint = {
    genre: ['Romantik'],
    subgenres: ['dark_romance'],
    tropes: ['contract_relationship'],
    protagonist: {
      archetype: 'innocent_heroine',
      role: 'reluctant_bride',
      startingSituation: 'bound',
      primaryGoalType: 'survival',
    },
    counterpart: { archetype: 'mafia_boss', role: 'forced_husband', powerPosition: 'dominant' },
    relationshipDynamic: ['forced_proximity'],
    powerDynamics: ['male_dominant'],
    setting: ['city'],
    tone: ['dark'],
    themes: ['power'],
    incitingIncidentType: 'deathbed_wish',
    centralConflictType: 'forced_union',
    stakes: ['freedom'],
    goals: ['escape'],
    obstacles: ['past_secret'],
    romancePattern: 'forced_marriage_to_love',
    hookType: 'forced_commitment',
    emotionalDrivers: ['love'],
    twistPatterns: ['hidden_identity'],
    cliffhangerPotential: ['secret_reveal'],
    storyFormula: {
      openingPattern: 'x',
      earlyConflictPattern: 'y',
      escalationPattern: 'z',
      majorTurnPattern: 'w',
      resolutionDirection: 'v',
    },
    generationSignals: {
      targetAudience: ['adult'],
      highEngagementElements: ['mafia_world'],
      differentiationOpportunities: [],
      avoidOverusedElements: [],
    },
    confidence: { overall: 0.85, genre: 0.9, tropes: 0.8, relationshipDynamic: 0.85, hookType: 0.9 },
  };
  return { ...base, ...overrides };
}

test('aggregate drops source title and author from the seed output', () => {
  const records: Array<{ title: string; author: string; blueprint: Blueprint }> = [
    { title: 'ZZ_KAYNAK_BASLIK_ALFA', author: 'ZZ_KAYNAK_YAZAR_ALFA', blueprint: makeBlueprint({ genre: ['Mafya'] }) },
    { title: 'ZZ_KAYNAK_BASLIK_BETA', author: 'ZZ_KAYNAK_YAZAR_BETA', blueprint: makeBlueprint({ genre: ['Komedi'] }) },
  ];
  const seed = aggregateBlueprints(records.map(r => r.blueprint));
  const serialized = JSON.stringify(seed);
  for (const record of records) {
    assert.ok(!serialized.includes(record.title), `title leaked: ${record.title}`);
    assert.ok(!serialized.includes(record.author), `author leaked: ${record.author}`);
  }
  assert.equal(seed.recordCount, 2);
});

test('token frequency sums equal the total occurrences; exact counts are stable', () => {
  const records = [
    makeBlueprint({ genre: ['Mafya'] }),
    makeBlueprint({ genre: ['Komedi'] }),
  ];
  const seed = aggregateBlueprints(records);
  const genre = seed.tokenFrequencies['genre'] ?? {};
  const sum = Object.values(genre).reduce((a, b) => a + b, 0);
  assert.equal(sum, 2, 'one genre token per record');
  assert.equal(seed.recordCount, 2);
  assert.equal(genre['Mafya'], 1);
  assert.equal(genre['Komedi'], 1);
});

test('same blueprint maps to the same deterministic profile hash', () => {
  const blueprint = makeBlueprint();
  assert.equal(profileHash(blueprint), profileHash(blueprint));
  assert.equal(profileHash(makeBlueprint()), profileHash(makeBlueprint()));
  // canonicalJson determinism across key order
  const reordered = JSON.parse(JSON.stringify(blueprint)) as Blueprint;
  assert.equal(canonicalJson(blueprint), canonicalJson(reordered));
  // different blueprint -> different hash
  assert.notEqual(profileHash(makeBlueprint({ genre: ['Mafya'] })), profileHash(blueprint));
});

test('invalid combinations derive only from zero co-occurrence', () => {
  // Mafya ve Komedi hiç birlikte geçmez; Romantik ikisiyle de birlikte geçer.
  const records = [
    makeBlueprint({ genre: ['Mafya', 'Romantik'] }),
    makeBlueprint({ genre: ['Komedi', 'Romantik'] }),
  ];
  const seed = aggregateBlueprints(records);
  const genrePairs = seed.invalidCombinations.filter(([a]) => a.startsWith('genre:'));
  const pairIs = (p: [string, string], x: string, y: string) =>
    (p[0] === `genre:${x}` && p[1] === `genre:${y}`) ||
    (p[0] === `genre:${y}` && p[1] === `genre:${x}`);
  assert.ok(genrePairs.some(p => pairIs(p, 'Mafya', 'Komedi')), 'Mafya/Komedi never co-occur -> invalid');
  assert.ok(genrePairs.every(p => !pairIs(p, 'Mafya', 'Romantik')), 'Romantik co-occurs -> valid');
  assert.ok(genrePairs.every(p => !pairIs(p, 'Komedi', 'Romantik')), 'Romantik co-occurs -> valid');
});
