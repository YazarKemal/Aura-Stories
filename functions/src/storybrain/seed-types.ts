/**
 * StoryBrain seed türleri — Aura tarafı.
 *
 * Kaynak: DreameResearchCollector data/dreame_blueprints_v2.jsonl dosyasındaki
 * HER KAYITTAKİ YALNIZCA `blueprint` nesnesinin AGREGAT edilmiş, kaynak-nötr
 * özetidir. `Blueprint` arayüzü bilinçli olarak title/author/synopsis/plot
 * alanı İÇERMEZ: derleyici yalnızca bu alanları okur ve türetilmiş `StoryBrainSeed`
 * hiçbir kaynak-tanımlayıcı dize taşımaz.
 */
export interface BlueprintProtagonist {
  archetype: string;
  role: string;
  startingSituation: string;
  primaryGoalType: string;
}

export interface BlueprintCounterpart {
  archetype: string;
  role: string;
  powerPosition: string;
}

export interface BlueprintStoryFormula {
  openingPattern: string;
  earlyConflictPattern: string;
  escalationPattern: string;
  majorTurnPattern: string;
  resolutionDirection: string;
}

export interface BlueprintGenerationSignals {
  targetAudience: string[];
  highEngagementElements: string[];
  differentiationOpportunities: string[];
  avoidOverusedElements: string[];
}

export interface BlueprintConfidence {
  overall: number;
  genre: number;
  tropes: number;
  relationshipDynamic: number;
  hookType: number;
}

/** Kaynak-nötr anlatı kalıbı. ASLA title/author/synopsis/plot barındırmaz. */
export interface Blueprint {
  genre: string[];
  subgenres: string[];
  tropes: string[];
  protagonist: BlueprintProtagonist;
  counterpart: BlueprintCounterpart;
  relationshipDynamic: string[];
  powerDynamics: string[];
  setting: string[];
  tone: string[];
  themes: string[];
  incitingIncidentType: string;
  centralConflictType: string;
  stakes: string[];
  goals: string[];
  obstacles: string[];
  romancePattern: string;
  hookType: string;
  emotionalDrivers: string[];
  twistPatterns: string[];
  cliffhangerPotential: string[];
  storyFormula: BlueprintStoryFormula;
  generationSignals: BlueprintGenerationSignals;
  confidence: BlueprintConfidence;
}

/**
 * Engine'in deterministik profil seçimi için profilePool'da tutulan, kaynak-nötr
 * kontrollü kelime dağarcığı. storyFormula serbest metni bilinçli olarak DIŞARIDA
 * bırakılır (bireysel olay örgüsü olarak yorumlanabilir — kopyalanmaz).
 */
export interface SeedProfileTokens {
  genre: string[];
  subgenres: string[];
  tropes: string[];
  protagonistArchetype: string;
  protagonistRole: string;
  protagonistGoalType: string;
  counterpartArchetype: string;
  counterpartRole: string;
  counterpartPowerPosition: string;
  relationshipDynamic: string[];
  powerDynamics: string[];
  setting: string[];
  tone: string[];
  themes: string[];
  incitingIncidentType: string;
  centralConflictType: string;
  stakes: string[];
  goals: string[];
  obstacles: string[];
  romancePattern: string;
  hookType: string;
  emotionalDrivers: string[];
  twistPatterns: string[];
  cliffhangerPotential: string[];
}

export interface SeedProfileConfidence {
  overall: number;
  genre: number;
  tropes: number;
  relationshipDynamic: number;
  hookType: number;
}

export interface SeedProfile {
  /** Deterministik uint32 — profileHash(canonicalJson(blueprint)). */
  id: number;
  blueprintHash: string;
  tokens: SeedProfileTokens;
  confidence: SeedProfileConfidence;
}

/** Derlenmiş, commit edilen seed dosyasının şeması (storybrain-seed.v1.json). */
export interface StoryBrainSeed {
  schemaVersion: number;
  source: string;
  recordCount: number;
  generatedAt: string;
  /** Alan başına kontrollü kelime → sıklık. Yalnızca blueprint'ten türetilir. */
  tokenFrequencies: Record<string, Record<string, number>>;
  /** storyFormula serbest metin alanlarının tamamlanma sayıları (metin yok). */
  storyFormulaCompleteness: Record<string, number>;
  generationSignalCounts: Record<string, Record<string, number>>;
  confidence: { overall: { min: number; mean: number; max: number } };
  /** Hiç birlikte geçmemiş (ortak sıklık 0) token çiftleri — istatistiksel, kaynak-nötr. */
  invalidCombinations: Array<[string, string]>;
  profilePool: SeedProfile[];
}
