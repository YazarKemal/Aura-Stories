import { z } from 'zod';

// ── Length Limits (sunucu tarafı sabit, istemciden DEĞİŞTİRİLEMEZ) ──

const CHAT_MSG_MAX_LENGTH = 2000;
const CHAT_MAX_MESSAGES = 30;
const CHAPTER_CONTENT_MAX_LENGTH = 8000;
const MAX_PREVIOUS_CHAPTERS = 10;
const STORY_SYNOPSIS_MAX_LENGTH = 3000;
const STORY_LONG_SYNOPSIS_MAX_LENGTH = 10000;

// ── Character Chat ───────────────────────────────────────────
// operationId zorunlu — idempotency için

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
  conversationSummary: z.string().max(2000),
});

export const characterChatInputSchema = z.object({
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(200),
  storySynopsis: z.string().min(1).max(STORY_SYNOPSIS_MAX_LENGTH),
  storyLongSynopsis: z.string().max(STORY_LONG_SYNOPSIS_MAX_LENGTH).optional(),
  storyTags: z.array(z.string().max(50)).max(20).optional(),
  storyAuthor: z.string().max(100).optional(),
  characterName: z.string().min(1).max(100),
  messages: z.array(chatMessageSchema).min(1).max(CHAT_MAX_MESSAGES),
  memoryContext: memoryContextSchema.optional(),
  operationId: z.string().min(1).max(200),
}).strict();

// AI fonksiyonları için operationId'li şema
export const chatOperationSchema = characterChatInputSchema;

// ── Story Generation ────────────────────────────────────────

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

export const generateStoryInputSchema = z.object({
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(200),
  storyAuthor: z.string().max(100).optional(),
  storySynopsis: z.string().min(1).max(STORY_SYNOPSIS_MAX_LENGTH),
  storyTags: z.array(z.string().max(50)).max(20).optional(),
  previousChapters: z.array(previousChapterSchema).max(MAX_PREVIOUS_CHAPTERS),
  chosenFate: chosenFateSchema,
  chapterNumber: z.number().int().positive().max(200),
}).strict();

// operationId + isForceChoice (maliyet belirleme için)
export const storyGenerateOperationSchema = generateStoryInputSchema.extend({
  operationId: z.string().min(1).max(200),
  isForceChoice: z.boolean(),
}).strict();

// ── Generated Output ────────────────────────────────────────

export const chapterOutputSchema = z.object({
  title: z.string().min(3).max(120),
  content: z.string().min(50).max(15000),
  optionA: z.string().min(5).max(300),
  optionB: z.string().min(5).max(300),
});

// ── Economy Operations ──────────────────────────────────────

export const economyOperationSchema = z.object({
  amount: z.number().int().positive().max(10000),
  operationId: z.string().min(1).max(200),
  detail: z.string().min(1).max(200),
}).strict();

export const claimGiftOperationSchema = z.object({
  operationId: z.string().min(1).max(200),
}).strict();

export const adRewardOperationSchema = z.object({
  operationId: z.string().min(1).max(200),
  mode: z.enum(['simulation', 'production']).optional(),
}).strict();
