
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
