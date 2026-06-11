'use client';

import { useState, useEffect } from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem 
} from '@/components/ui/carousel';
import { stories, categories } from '@/lib/mock-data';
import { StoryCard } from './story-card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { personalizeStoryRecommendations } from '@/ai/flows/personalized-story-recommendations-flow';
import { Story } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface DiscoverScreenProps {
  onSelectStory: (story: Story) => void;
}

export function DiscoverScreen({ onSelectStory }: DiscoverScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');
  const [aiRecommendations, setAiRecommendations] = useState<Story[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  useEffect(() => {
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
        console.error('AI Recommendations failed even after retries:', error);
        // Fallback to high-quality mock data if AI is down
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
                <div className="relative h-[220px] mx-4 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
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
      <section className="px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => setSelectedCategory('Hepsi')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'Hepsi' 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'bg-white text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            Hepsi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : 'bg-white text-muted-foreground border border-border hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Popular Section */}
      <section className="px-4">
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
              <div key={i} className="flex gap-4 p-3 rounded-2xl bg-white border border-border shadow-sm">
                <Skeleton className="h-32 w-24 rounded-lg" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-10 w-full" />
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
