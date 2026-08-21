export type StoryExperienceMode = 'classic' | 'dynamic';

/**
 * Yazarın hikâye başına açıp kapatabileceği deneyim özellikleri.
 * Eski hikâyelerde alan yoksa Aura mevcut davranışı korumak için dynamic
 * varsayılanıyla çalışır.
 */
export interface StoryExperienceConfig {
  /** classic = yalnız yazarın kanonik metni, dynamic = AI branch + Character Room. */
  mode?: StoryExperienceMode;
  /** Yazarın kendisinin yazdığı, AI dallanmasından önce gelen başlangıç bölüm sayısı. */
  baseChapterCount?: number;
  /** Karakterlerle sohbet özelliği açık mı? */
  characterRoomEnabled?: boolean;
  /** Okuyucu Character Room üzerinden kanonik world-state etkisi yaratabilir mi? */
  readerParticipationEnabled?: boolean;
  /** Paylaşılan branch'lerde izinli kullanıcı Character Echo'ları oluşabilir mi? */
  characterEchoEnabled?: boolean;
}

export interface Story {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  longSynopsis?: string;
  imageUrl: string;
  readCount: number;
  rating?: number;
  category: string;
  tags?: string[];
  isPopular?: boolean;
  isFeatured?: boolean;
  wordCount: number;
  status: 'ongoing' | 'completed';
  isDownloaded?: boolean;
  /** Total number of chapters in this story */
  totalChapters?: number;
  /** Yazarın Dynamic Story / Character Room tercihleri. */
  experience?: StoryExperienceConfig;
}

export interface Category {
  id: string;
  name: string;
}

/** A character that can be chatted with in the Character Room */
export interface CharacterRoster {
  id: string;
  name: string;
  role: string;
  personality: string;
  /** The chapter number at which this character becomes available to chat */
  unlockedAtChapter: number;
  /** Initial greeting when first chatting */
  greeting: string;
  /** Image URL for the character avatar */
  avatarUrl?: string;
  /** Story this character belongs to */
  storyId: string;
}

export interface CharacterRosterChapterContext {
  chapterNumber: number;
  title: string;
  content: string;
}

export interface DynamicCharacterRosterInput {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyTags?: string[];
  currentChapter: number;
  chapters: CharacterRosterChapterContext[];
}

export interface DynamicCharacterRosterResult {
  characters: CharacterRoster[];
  sourceRevision: string;
}
