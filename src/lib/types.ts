
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
}

export interface Category {
  id: string;
  name: string;
}
