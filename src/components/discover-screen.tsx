
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem 
} from '@/components/ui/carousel';
import { stories as mockStories, categories as mockCategories } from '@/lib/mock-data';
import { StoryCard } from './story-card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { personalizeStoryRecommendations } from '@/ai/flows/personalized-story-recommendations-flow';
import { Story, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getStories, getCategories, seedStoriesToFirestore, onStoriesSnapshot } from '@/lib/firebase';

interface DiscoverScreenProps {
  onSelectStory: (story: Story) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function DiscoverScreen({ onSelectStory, selectedCategory, onCategoryChange }: DiscoverScreenProps) {
  const [stories, setStories] = useState<Story[]>(mockStories);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [aiRecommendations, setAiRecommendations] = useState<Story[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const fetchInitiated = useRef(false);

  // Firestore canlı veri + seed (ilk kullanımda mock veriyi Firestore'a yazar)
  useEffect(() => {
    const unsub = onStoriesSnapshot((firestoreStories) => {
      if (firestoreStories.length > 0) {
        setStories(firestoreStories);
      } else {
        // Firestore boş → seed'le
        seedStoriesToFirestore(mockStories, mockCategories).then(() => {
          setStories(mockStories);
        }).catch(() => {
          setStories(mockStories);
        });
      }
    });
    // Kategorileri Firestore'dan çek, yoksa mock kullan
    getCategories().then(cats => {
      if (cats.length > 0) setCategories(cats);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (fetchInitiated.current) return;
    fetchInitiated.current = true;

    async function fetchAiRecommendations() {
      setIsLoadingAi(true);
      try {
        const result = await personalizeStoryRecommendations({
          readingHistory: ['Gece Yarısı Güneşi', 'Mühürlü Kapı'],
          preferences: 'Aşk, Gizem ve Tarih kokan hikayeleri severim.'
        });

        const transformed: Story[] = result.recommendations.map((rec, index) => ({
          id: `ai-${index}`,
          title: rec.title,
          author: rec.author,
          synopsis: rec.synopsis,
          imageUrl: rec.imageUrl || PlaceHolderImages.find(img => img.id === `book-${(index % 6) + 1}`)?.imageUrl || '',
          readCount: rec.readCount,
          category: 'Özel',
          tags: ['AI Seçimi', 'Özel'],
        }));

        setAiRecommendations(transformed);
      } catch (error) {
        const fallback: Story[] = stories
          .filter(s => s.isPopular)
          .slice(0, 3)
          .map((s, index) => ({
            ...s,
            id: `fallback-${index}`,
            tags: [...(s.tags || []), 'Sizin İçin'],
          }));
        setAiRecommendations(fallback);
      } finally {
        setIsLoadingAi(false);
      }
    }

    fetchAiRecommendations();
  }, []);

  const featuredBanners = [
    { id: 1, img: PlaceHolderImages.find(i => i.id === 'banner-1')?.imageUrl || '' },
    { id: 2, img: PlaceHolderImages.find(i => i.id === 'banner-2')?.imageUrl || '' },
    { id: 3, img: PlaceHolderImages.find(i => i.id === 'banner-3')?.imageUrl || '' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in duration-700">
      {/* Featured Carousel */}
      <section className="px-0">
        <Carousel className="w-full" opts={{ loop: true }}>
          <CarouselContent>
            {featuredBanners.map((banner) => (
              <CarouselItem key={banner.id}>
                <div className="relative aspect-[16/10] mx-4 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                  <Image
                    src={banner.img}
                    alt="Featured Story"
                    fill
                    className="object-cover"
                    data-ai-hint="aesthetic banner"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <span className="text-[10px] uppercase tracking-widest font-bold bg-primary px-2 py-1 rounded-md">Editörün Seçimi</span>
                      <h2 className="text-2xl font-headline font-bold mt-1 leading-tight">Gökkuşağının Ötesinde</h2>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Categories Row */}
      <section>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-4">
          <button
            onClick={() => onCategoryChange('Hepsi')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'Hepsi' 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'bg-white dark:bg-zinc-900/80 dark:border-zinc-700/50 dark:text-zinc-400 text-muted-foreground border border-border hover:bg-muted dark:hover:bg-zinc-800'
            }`}
          >
            Hepsi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.name)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : 'bg-white dark:bg-zinc-900/80 dark:border-zinc-700/50 dark:text-zinc-400 text-muted-foreground border border-border hover:bg-muted dark:hover:bg-zinc-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Popular Section */}
      <section className="px-4 animate-in fade-in slide-in-from-bottom-2 duration-500" key={selectedCategory}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-accent">Popüler</h3>
          <span className="text-xs font-medium text-primary cursor-pointer hover:underline">Tümünü Gör</span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
          {stories
            .filter(s => (selectedCategory === 'Hepsi' || s.category === selectedCategory) && s.isPopular)
            .map(story => (
              <StoryCard key={story.id} story={story} variant="popular" onClick={onSelectStory} />
            ))
          }
        </div>
      </section>

      {/* Recommended for You Section */}
      <section className="px-4">
        <div className="flex flex-col gap-1 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-headline font-bold text-accent">Zevkinize Göre</h3>
            <Badge className="bg-gradient-to-r from-primary to-accent border-none text-[9px] h-4">AI AKILLI SEÇİM</Badge>
          </div>
          <p className="text-xs text-muted-foreground italic">Okuma geçmişinize göre kişiselleştirildi.</p>
        </div>
        
        <div className="flex flex-col gap-4">
          {isLoadingAi ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/80 dark:border-zinc-800 border border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <Skeleton className="h-32 w-24 rounded-lg bg-gradient-to-br from-muted/50 via-muted to-muted/30 animate-pulse" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-5 w-3/4 bg-gradient-to-r from-muted/50 to-muted/30 animate-pulse" />
                  <Skeleton className="h-3 w-1/4 bg-gradient-to-r from-muted/50 to-muted/30 animate-pulse" />
                  <Skeleton className="h-10 w-full bg-gradient-to-r from-muted/40 to-muted/20 animate-pulse" />
                </div>
              </div>
            ))
          ) : (
            aiRecommendations.map(story => (
              <StoryCard key={story.id} story={story} variant="recommended" onClick={onSelectStory} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
