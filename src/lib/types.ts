
export interface Story {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  imageUrl: string;
  readCount: number;
  category: string;
  isPopular?: boolean;
  isFeatured?: boolean;
}

export interface Category {
  id: string;
  name: string;
}
