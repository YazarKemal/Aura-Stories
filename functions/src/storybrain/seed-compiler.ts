/**
 * StoryBrain seed derleyicisi (offline, kaynak-nötr).
 *
 * DreameResearchCollector data/dreame_blueprints_v2.jsonl dosyasındaki her
 * kaydın YALNIZCA `blueprint` nesnesini okur, agrega eder ve
 * `storybrain-seed.v1.json` dosyasını üretir.
 *
 * KAYNAK-NÖTRLÜK: `parseBlueprintRecord` yalnızca record.blueprint alır;
 * title/author/synopsis/plot ASLA kapsama girmez ve türetilen seed'de hiçbir
 * kaynak-tanımlayıcı dize bulunmaz. storyFormula serbest metni (bireysel olay
 * örgüsü olarak yorumlanabilir) seed'e kopyalanmaz — yalnızca tamamlanma sayısı
 * raporlanır.
 *
 * CLI (build-time): tsx src/storybrain/seed-compiler.ts --input <jsonl> --output <path>
 * Guard: modül import edildiğinde (ör. test) hiçbir yan etki çalışmaz.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import type {
  Blueprint,
  SeedProfile,
  SeedProfileTokens,
  StoryBrainSeed,
} from './seed-types';

const MAX_INVALID_PAIRS = 50;
const INVALID_FIELDS = ['genre', 'subgenres', 'tropes', 'relationshipDynamic', 'tone', 'themes'] as const;

const stringArray = z.array(z.string());

const blueprintSchema = z
  .object({
    genre: stringArray,
    subgenres: stringArray,
    tropes: stringArray,
    protagonist: z.object({
      archetype: z.string(),
      role: z.string(),
      startingSituation: z.string(),
      primaryGoalType: z.string(),
    }),
    counterpart: z.object({
      archetype: z.string(),
      role: z.string(),
      powerPosition: z.string(),
    }),
    relationshipDynamic: stringArray,
    powerDynamics: stringArray,
    setting: stringArray,
    tone: stringArray,
    themes: stringArray,
    incitingIncidentType: z.string(),
    centralConflictType: z.string(),
    stakes: stringArray,
    goals: stringArray,
    obstacles: stringArray,
    romancePattern: z.string(),
    hookType: z.string(),
    emotionalDrivers: stringArray,
    twistPatterns: stringArray,
    cliffhangerPotential: stringArray,
    storyFormula: z.object({
      openingPattern: z.string(),
      earlyConflictPattern: z.string(),
      escalationPattern: z.string(),
      majorTurnPattern: z.string(),
      resolutionDirection: z.string(),
    }),
    generationSignals: z.object({
      targetAudience: stringArray,
      highEngagementElements: stringArray,
      differentiationOpportunities: stringArray,
      avoidOverusedElements: stringArray,
    }),
    confidence: z.object({
      overall: z.number(),
      genre: z.number(),
      tropes: z.number(),
      relationshipDynamic: z.number(),
      hookType: z.number(),
    }),
  })
  .strict();

/**
 * Tek bir jsonl satırından kaynak-nötr Blueprint çıkarır.
 * record.blueprint dışındaki hiçbir alan (title/author/...) okunmaz.
 */
export function parseBlueprintRecord(line: string): Blueprint | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const blueprint = (raw as { blueprint?: unknown }).blueprint;
  if (!blueprint || typeof blueprint !== 'object') return null;
  const parsed = blueprintSchema.safeParse(blueprint);
  return parsed.success ? (parsed.data as Blueprint) : null;
}

/** Deterministik, anahtar-sıralı JSON serileştirme (karma kararlılığı için). */
export function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      const record: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        record[key] = sort((v as Record<string, unknown>)[key]);
      }
      return record;
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/** Bir blueprint kaydına kararlı uint32 profil kimliği. Aynı kayıt → aynı id. */
export function profileHash(blueprint: Blueprint): number {
  const digest = createHash('sha256').update(canonicalJson(blueprint)).digest();
  return digest.readUInt32LE(0);
}

function tokensFromBlueprint(blueprint: Blueprint): SeedProfileTokens {
  return {
    genre: blueprint.genre,
    subgenres: blueprint.subgenres,
    tropes: blueprint.tropes,
    protagonistArchetype: blueprint.protagonist.archetype,
    protagonistRole: blueprint.protagonist.role,
    protagonistGoalType: blueprint.protagonist.primaryGoalType,
    counterpartArchetype: blueprint.counterpart.archetype,
    counterpartRole: blueprint.counterpart.role,
    counterpartPowerPosition: blueprint.counterpart.powerPosition,
    relationshipDynamic: blueprint.relationshipDynamic,
    powerDynamics: blueprint.powerDynamics,
    setting: blueprint.setting,
    tone: blueprint.tone,
    themes: blueprint.themes,
    incitingIncidentType: blueprint.incitingIncidentType,
    centralConflictType: blueprint.centralConflictType,
    stakes: blueprint.stakes,
    goals: blueprint.goals,
    obstacles: blueprint.obstacles,
    romancePattern: blueprint.romancePattern,
    hookType: blueprint.hookType,
    emotionalDrivers: blueprint.emotionalDrivers,
    twistPatterns: blueprint.twistPatterns,
    cliffhangerPotential: blueprint.cliffhangerPotential,
  };
}

const ARRAY_TOKEN_FIELDS = [
  'genre', 'subgenres', 'tropes', 'relationshipDynamic', 'powerDynamics',
  'setting', 'tone', 'themes', 'stakes', 'goals', 'obstacles',
  'emotionalDrivers', 'twistPatterns', 'cliffhangerPotential',
] as const;

const STRING_TOKEN_FIELDS = [
  'protagonistArchetype', 'protagonistRole', 'protagonistGoalType',
  'counterpartArchetype', 'counterpartRole', 'counterpartPowerPosition',
  'incitingIncidentType', 'centralConflictType', 'romancePattern', 'hookType',
] as const;

type TokenProfile = Pick<SeedProfileTokens, typeof ARRAY_TOKEN_FIELDS[number] | typeof STRING_TOKEN_FIELDS[number]>;

function buildTokenFrequencies(pool: SeedProfile[]): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const field of ARRAY_TOKEN_FIELDS) {
    const map: Record<string, number> = {};
    for (const profile of pool) {
      for (const token of (profile.tokens as TokenProfile)[field] as string[]) {
        if (token) map[token] = (map[token] || 0) + 1;
      }
    }
    result[field] = map;
  }
  for (const field of STRING_TOKEN_FIELDS) {
    const map: Record<string, number> = {};
    for (const profile of pool) {
      const token = (profile.tokens as TokenProfile)[field] as string;
      if (token) map[token] = (map[token] || 0) + 1;
    }
    result[field] = map;
  }
  return result;
}

function buildGenerationSignalCounts(records: Blueprint[]): Record<string, Record<string, number>> {
  const fields = [
    'targetAudience', 'highEngagementElements',
    'differentiationOpportunities', 'avoidOverusedElements',
  ] as const;
  const result: Record<string, Record<string, number>> = {};
  for (const field of fields) {
    const map: Record<string, number> = {};
    for (const record of records) {
      for (const token of record.generationSignals[field]) {
        if (token) map[token] = (map[token] || 0) + 1;
      }
    }
    result[field] = map;
  }
  return result;
}

function buildStoryFormulaCompleteness(records: Blueprint[]): Record<string, number> {
  const fields = [
    'openingPattern', 'earlyConflictPattern', 'escalationPattern',
    'majorTurnPattern', 'resolutionDirection',
  ] as const;
  const result: Record<string, number> = {};
  for (const field of fields) {
    result[field] = records.filter(record => Boolean(record.storyFormula[field])).length;
  }
  return result;
}

/**
 * İstatistiksel uyumsuzluk türetme: bir token çifti, her ikisi de korpusta en az
 * bir kez geçmesine rağmen hiç birlikte geçmemişse (ortak sıklık 0) uyumsuz kabul
 * edilir. Anlatısal yorum içermez — tamamen kaynak-nötr kofrekans analizidir.
 */
function deriveInvalidCombinations(records: Blueprint[]): Array<[string, string]> {
  const scored: Array<{ a: string; b: string; score: number }> = [];
  for (const field of INVALID_FIELDS) {
    const tokenRecs = new Map<string, Set<number>>();
    const freq = new Map<string, number>();
    records.forEach((record, index) => {
      for (const token of record[field]) {
        if (!tokenRecs.has(token)) {
          tokenRecs.set(token, new Set());
          freq.set(token, 0);
        }
        tokenRecs.get(token)!.add(index);
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    });
    const tokens = [...tokenRecs.keys()];
    for (let i = 0; i < tokens.length; i += 1) {
      for (let j = i + 1; j < tokens.length; j += 1) {
        const a = tokens[i]!;
        const b = tokens[j]!;
        const overlap = [...tokenRecs.get(a)!].some(index => tokenRecs.get(b)!.has(index));
        if (!overlap) {
          scored.push({
            a: `${field}:${a}`,
            b: `${field}:${b}`,
            score: Math.min(freq.get(a)!, freq.get(b)!),
          });
        }
      }
    }
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, MAX_INVALID_PAIRS).map(s => [s.a, s.b]);
}

/** Saf, test edilebilir agregasyon. Firestore / I/O içermez. */
export function aggregateBlueprints(records: Blueprint[]): StoryBrainSeed {
  const pool: SeedProfile[] = records.map(blueprint => ({
    id: profileHash(blueprint),
    blueprintHash: `0x${profileHash(blueprint).toString(16)}`,
    tokens: tokensFromBlueprint(blueprint),
    confidence: { ...blueprint.confidence },
  }));

  const overall = records.map(r => r.confidence.overall);
  const min = overall.length ? Math.min(...overall) : 0;
  const max = overall.length ? Math.max(...overall) : 0;
  const mean = overall.length
    ? overall.reduce((sum, v) => sum + v, 0) / overall.length
    : 0;

  return {
    schemaVersion: 1,
    source: 'aggregate_dreame_blueprint_v2_tokens',
    recordCount: records.length,
    generatedAt: new Date().toISOString(),
    tokenFrequencies: buildTokenFrequencies(pool),
    storyFormulaCompleteness: buildStoryFormulaCompleteness(records),
    generationSignalCounts: buildGenerationSignalCounts(records),
    confidence: { overall: { min, mean, max } },
    invalidCombinations: deriveInvalidCombinations(records),
    profilePool: pool,
  };
}

function parseArgs(argv: string[]): { input?: string; output?: string } {
  const out: { input?: string; output?: string } = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') out.input = argv[i + 1];
    if (argv[i] === '--output') out.output = argv[i + 1];
  }
  return out;
}

export function main(argv: string[]): void {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;
  if (!input || !output) {
    console.error('Usage: tsx src/storybrain/seed-compiler.ts --input <jsonl> --output <path>');
    process.exit(1);
  }
  const text = readFileSync(input, 'utf8');
  const records: Blueprint[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = parseBlueprintRecord(line);
    if (parsed) records.push(parsed);
    else skipped += 1;
  }
  const seed = aggregateBlueprints(records);
  writeFileSync(output, JSON.stringify(seed, null, 2));
  console.info(`[storybrain] compiled ${records.length} blueprints (${skipped} skipped) -> ${args.output}`);
}

// Modül import edildiğinde (ör. test) çalışmaz; yalnızca doğrudan CLI çalıştırmasında.
if (require.main === module) {
  main(process.argv.slice(2));
}
