import { z } from 'zod';

// ── Length Limits ─────────────────────────────────────────────

const CHAT_MSG_MAX_LENGTH = 2000;
const CHAT_MAX_MESSAGES = 30;
const CHAPTER_CONTENT_MAX_LENGTH = 8000;
const MAX_PREVIOUS_CHAPTERS = 30;
const STORY_SYNOPSIS_MAX_LENGTH = 3000;
const STORY_LONG_SYNOPSIS_MAX_LENGTH = 10000;

// ── Chat ──────────────────────────────────────────────────────

const chatMessageSchema = z.object({
  text: z.string().min(1).max(CHAT_MSG_MAX_LENGTH),
  sender: z.enum(['user', 'character']),
});

const learnedFactSchema = z.object({
  fact: z.string().min(1).max(500),
  revealedBy: z.string().max(200),
  timestamp: z.string().max(50),
  importance: z.enum(['minor', 'major', 'critical']),
});

export const memoryContextSchema = z.object({
  personality: z.string().max(500),
  knownSecrets: z.array(z.string().max(500)).max(30),
  hiddenSecrets: z.array(z.string().max(500)).max(30),
  learnedFacts: z.array(learnedFactSchema).max(20),
  conversationSummary: z.string().max(2400),
});

export const characterChatInputSchema = z.object({
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(200),
  storySynopsis: z.string().min(1).max(STORY_SYNOPSIS_MAX_LENGTH),
  storyLongSynopsis: z.string().max(STORY_LONG_SYNOPSIS_MAX_LENGTH).optional(),
  storyTags: z.array(z.string().max(50)).max(20).optional(),
  storyAuthor: z.string().max(100).optional(),
  characterName: z.string().min(1).max(100),
  characterRole: z.string().min(1).max(160).optional(),
  characterPersonality: z.string().min(1).max(500).optional(),
  messages: z.array(chatMessageSchema).min(1).max(CHAT_MAX_MESSAGES),
  memoryContext: memoryContextSchema.optional(),
  operationId: z.string().min(1).max(200),
}).strict();

export const chatOperationSchema = characterChatInputSchema;

// Modelin kullanıcıya görünen cevapla birlikte çıkardığı Dynamic Story etkileri.
// Bunlar istemci payload'ı değildir; yalnızca server-side model çıktısı doğrulanır.
const dynamicChatEventCandidateSchema = z.object({
  type: z.enum([
    'fact_revealed',
    'warning',
    'intervention',
    'identity_claim',
    'promise',
    'threat',
    'rescue',
    'relationship_change',
    'other',
  ]),
  summary: z.string().min(3).max(500),
  fact: z.string().min(1).max(500).optional(),
  subjectCharacter: z.string().min(1).max(100).optional(),
  belief: z.enum(['accepted', 'uncertain', 'rejected', 'not_applicable']),
  importance: z.enum(['minor', 'major', 'critical']),
  shouldAffectStory: z.boolean(),
}).strict();

const dynamicRelationshipDeltaSchema = z.object({
  characterName: z.string().min(1).max(100).optional(),
  trust: z.number().int().min(-30).max(30),
  affinity: z.number().int().min(-30).max(30),
  suspicion: z.number().int().min(-30).max(30),
  hostility: z.number().int().min(-30).max(30),
  reason: z.string().min(1).max(300),
}).strict();

const dynamicParticipantSignalSchema = z.object({
  status: z.enum(['none', 'noticed', 'recognized']),
  publicName: z.string().min(1).max(80).optional(),
  publicRole: z.string().min(1).max(100).optional(),
  reason: z.string().min(1).max(300).optional(),
  significance: z.enum(['none', 'minor', 'major', 'critical']),
}).strict();

export const characterChatModelOutputSchema = z.object({
  reply: z.string().min(1).max(4000),
  effects: z.object({
    events: z.array(dynamicChatEventCandidateSchema).max(4).default([]),
    relationshipDeltas: z.array(dynamicRelationshipDeltaSchema).max(3).default([]),
    participant: dynamicParticipantSignalSchema.optional(),
  }).strict(),
}).strict();

// ── Dynamic Character Roster ─────────────────────────────────

const characterRosterChapterSchema = z.object({
  chapterNumber: z.number().int().positive().max(200),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(CHAPTER_CONTENT_MAX_LENGTH),
}).strict();

export const characterRosterInputSchema = z.object({
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(200),
  storySynopsis: z.string().min(1).max(STORY_SYNOPSIS_MAX_LENGTH),
  storyTags: z.array(z.string().max(50)).max(20).optional(),
  currentChapter: z.number().int().positive().max(200),
  chapters: z.array(characterRosterChapterSchema).max(10),
}).strict();

export const characterRosterItemSchema = z.object({
  id: z.string().min(1).max(140),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(160),
  personality: z.string().min(3).max(500),
  unlockedAtChapter: z.number().int().positive().max(200),
  greeting: z.string().min(3).max(700),
  storyId: z.string().min(1).max(100),
}).strict();

export const characterRosterOutputSchema = z.object({
  characters: z.array(characterRosterItemSchema).min(1).max(6),
  sourceRevision: z.string().min(1).max(120),
}).strict();

// ── Story Generation ──────────────────────────────────────────

const previousChapterSchema = z.object({
  chapterNumber: z.number().int().positive().max(200),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(CHAPTER_CONTENT_MAX_LENGTH),
  chosenOption: z.string().max(500).optional(),
});

const chosenFateSchema = z.object({
  option: z.enum(['A', 'B']),
  text: z.string().min(1).max(500),
  isForceChoice: z.boolean(),
});

const readerPersonaSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(80),
  traits: z.array(z.string().min(1).max(60)).max(6),
  note: z.string().max(500),
  identityDisclosure: z.enum(['contextual', 'always', 'anonymous']).optional(),
  echoVisibility: z.enum(['private', 'shared', 'anonymous']).optional(),
}).strict();

export const generateStoryInputSchema = z.object({
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(200),
  storyAuthor: z.string().max(100).optional(),
  storySynopsis: z.string().min(1).max(STORY_SYNOPSIS_MAX_LENGTH),
  storyTags: z.array(z.string().max(50)).max(20).optional(),
  previousChapters: z.array(previousChapterSchema).max(MAX_PREVIOUS_CHAPTERS),
  chosenFate: chosenFateSchema,
  chapterNumber: z.number().int().positive().max(200),
  readerPersona: readerPersonaSchema.optional(),
}).strict();

export const storyGenerateOperationSchema = generateStoryInputSchema.extend({
  operationId: z.string().min(1).max(200),
  action: z.enum(['chapter_unlock', 'force_fate']),
}).strict();

// ── Output ────────────────────────────────────────────────────

export const chapterOutputSchema = z.object({
  title: z.string().min(3).max(120),
  content: z.string().min(50).max(15000),
  optionA: z.string().min(5).max(300),
  optionB: z.string().min(5).max(300),
});

// ── Action-Based Economy ──────────────────────────────────────

export const fullAccessActionSchema = z.object({
  operationId: z.string().min(1).max(200),
  storyId: z.string().min(1).max(100),
}).strict();

// ── Daily Gift ────────────────────────────────────────────────

export const claimGiftOperationSchema = z.object({
  operationId: z.string().min(1).max(200),
}).strict();
