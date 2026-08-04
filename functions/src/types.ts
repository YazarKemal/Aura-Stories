// ── Chat Types ────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** İstemci localStorage'ında tutulan lore memory'nin sunucuya iletilen kısmı */
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
  messages: { text: string; sender: 'user' | 'character' }[];
  /** Lore memory verisi — system prompt sunucuda bundan oluşturulur */
  memoryContext?: LoreMemoryContext;
}

export interface CharacterChatOutput {
  text: string;
  characterName: string;
  memoryUpdates: string[] | null;
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

export interface GenerateStoryInput {
  storyId: string;
  storyTitle: string;
  storyAuthor?: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: ChosenFate;
  chapterNumber: number;
}

export interface GenerateStoryOutput {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}
