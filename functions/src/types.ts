// ── Chat Types ────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LoreMemoryContext {
  personality: string;
  knownSecrets: string[];
  hiddenSecrets: string[];
  learnedFacts: { fact: string; revealedBy: string; timestamp: string; importance: 'minor' | 'major' | 'critical' }[];
  conversationSummary: string;
}

// ── Dynamic Story / World State ───────────────────────────────

export type DynamicEventType =
  | 'fact_revealed'
  | 'warning'
  | 'intervention'
  | 'identity_claim'
  | 'promise'
  | 'threat'
  | 'rescue'
  | 'relationship_change'
  | 'other';

export type DynamicBeliefState = 'accepted' | 'uncertain' | 'rejected' | 'not_applicable';
export type DynamicImportance = 'minor' | 'major' | 'critical';
export type DynamicParticipantStatus = 'none' | 'noticed' | 'recognized';
export type CharacterEchoVisibility = 'private' | 'shared' | 'anonymous';

/**
 * Modelin tek bir Character Room mesajından çıkardığı olay adayı.
 * Bu veri doğrudan kullanıcı tarafından gönderilmez; Functions tarafında
 * model yanıtından parse edilir ve server-authoritative world state'e uygulanır.
 */
export interface DynamicChatEventCandidate {
  type: DynamicEventType;
  summary: string;
  fact?: string;
  subjectCharacter?: string;
  belief: DynamicBeliefState;
  importance: DynamicImportance;
  shouldAffectStory: boolean;
}

export interface DynamicRelationshipDelta {
  characterName?: string;
  trust: number;
  affinity: number;
  suspicion: number;
  hostility: number;
  reason: string;
}

export interface DynamicParticipantSignal {
  status: DynamicParticipantStatus;
  publicName?: string;
  publicRole?: string;
  reason?: string;
  significance: 'none' | DynamicImportance;
}

export interface DynamicChatEffects {
  events: DynamicChatEventCandidate[];
  relationshipDeltas: DynamicRelationshipDelta[];
  participant?: DynamicParticipantSignal;
}

export interface DynamicStoryEvent extends DynamicChatEventCandidate {
  id: string;
  targetCharacter: string;
  createdAt: number;
  revision: number;
}

export interface DynamicRelationshipState {
  characterName: string;
  trust: number;
  affinity: number;
  suspicion: number;
  hostility: number;
  lastReason?: string;
  revision: number;
}

export interface DynamicParticipantState {
  status: DynamicParticipantStatus;
  publicName?: string;
  publicRole?: string;
  reason?: string;
  significance: 'none' | DynamicImportance;
  firstSeenRevision?: number;
  lastSeenRevision?: number;
}

export interface DynamicStoryState {
  version: 1;
  storyId: string;
  revision: number;
  participant: DynamicParticipantState;
  events: DynamicStoryEvent[];
  relationships: DynamicRelationshipState[];
  updatedAt: number;
}

export interface CharacterChatInput {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyLongSynopsis?: string;
  storyTags?: string[];
  storyAuthor?: string;
  characterName: string;
  characterRole?: string;
  characterPersonality?: string;
  messages: { text: string; sender: 'user' | 'character' }[];
  memoryContext?: LoreMemoryContext;
  /** Server-only: character-specific projection of the canonical dynamic branch. */
  dynamicContext?: string;
}

export interface CharacterChatOutput {
  text: string;
  characterName: string;
  memoryUpdates: string[] | null;
  worldUpdate?: {
    revision: number;
    participantStatus: DynamicParticipantStatus;
    canonicalEvents: number;
  };
}

// ── Dynamic Character Roster Types ───────────────────────────

export interface CharacterRosterChapterContext {
  chapterNumber: number;
  title: string;
  content: string;
}

export interface CharacterRosterInput {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyTags?: string[];
  currentChapter: number;
  chapters: CharacterRosterChapterContext[];
}

export interface CharacterRosterOutputItem {
  id: string;
  name: string;
  role: string;
  personality: string;
  unlockedAtChapter: number;
  greeting: string;
  storyId: string;
}

export interface CharacterRosterOutput {
  characters: CharacterRosterOutputItem[];
  sourceRevision: string;
}

// ── Story Generation Types ──────────────────────────────────

export interface PreviousChapter {
  chapterNumber: number;
  title: string;
  content: string;
  chosenOption?: string;
}

export interface ChosenFate {
  option: 'A' | 'B';
  text: string;
  isForceChoice: boolean;
}

export interface StoryReaderPersona {
  name: string;
  role: string;
  traits: string[];
  note: string;
  /**
   * contextual: karakterler adı/rolü ancak sohbet içinde öğrenirse kullanır.
   * always: bu hikâye dalında kimlik başlangıçtan itibaren bilinir.
   * anonymous: tercih edilen isim metadata'da kalsa bile karakterlere açıklanmaz.
   */
  identityDisclosure?: 'contextual' | 'always' | 'anonymous';
  /** Paylaşılan branch'lerde AI Character Echo görünürlüğü. */
  echoVisibility?: CharacterEchoVisibility;
}

export interface GenerateStoryInput {
  storyId: string;
  storyTitle: string;
  storyAuthor?: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: ChosenFate;
  chapterNumber: number;
  readerPersona?: StoryReaderPersona;
  /** Server-only canonical world state projection. Client bu alanı gönderemez. */
  dynamicContext?: string;
}

export interface GenerateStoryOutput {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}
