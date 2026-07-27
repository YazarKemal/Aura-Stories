import { z } from 'zod';

// ── Character Chat ───────────────────────────────────────────

const chatMessageSchema = z.object({
  text: z.string().min(1).max(4000),
  sender: z.enum(['user', 'character']),
});

export const characterChatInputSchema = z.object({
  storyId: z.string().min(1),
  storyTitle: z.string().min(1).max(200),
  storySynopsis: z.string().min(1),
  storyLongSynopsis: z.string().optional(),
  storyTags: z.array(z.string()).optional(),
  storyAuthor: z.string().optional(),
  characterName: z.string().min(1).max(100),
  messages: z.array(chatMessageSchema).min(1).max(30),
});

// ── Story Generation ────────────────────────────────────────

const previousChapterSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1).max(12000),
  chosenOption: z.string().optional(),
});

const chosenFateSchema = z.object({
  option: z.enum(['A', 'B']),
  text: z.string().min(1).max(500),
  isForceChoice: z.boolean(),
});

export const generateStoryInputSchema = z.object({
  storyId: z.string().min(1),
  storyTitle: z.string().min(1),
  storyAuthor: z.string().optional(),
  storySynopsis: z.string().min(1),
  storyTags: z.array(z.string()).optional(),
  previousChapters: z.array(previousChapterSchema).max(20),
  chosenFate: chosenFateSchema,
  chapterNumber: z.number().int().positive().max(200),
});

// ── Generated Output ────────────────────────────────────────

export const chapterOutputSchema = z.object({
  title: z.string().min(3).max(120),
  content: z.string().min(400).max(15000),
  optionA: z.string().min(10).max(300),
  optionB: z.string().min(10).max(300),
});
