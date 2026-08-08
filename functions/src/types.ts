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
}

export interface CharacterChatOutput {
  text: string;
  characterName: string;
  memoryUpdates: string[] | null;
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
}

export interface GenerateStoryOutput {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}
