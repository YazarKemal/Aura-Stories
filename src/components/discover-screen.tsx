
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
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

  // ── Carousel autoplay + pagination state ──────────────
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

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

  // ── Carousel: slide tracking ─────────────────────────
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };

    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', () => {
      setTotalSlides(carouselApi.scrollSnapList().length);
      onSelect();
    });

    // init
    setTotalSlides(carouselApi.scrollSnapList().length);
    setCurrentSlide(carouselApi.selectedScrollSnap());

    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  // ── Carousel: autoplay (3.5s, pause on touch) ────────
  useEffect(() => {
    if (!carouselApi) return;

    const start = () => {
      stop();
      autoplayRef.current = setInterval(() => {
        carouselApi.scrollNext();
      }, 3500);
    };

    const stop = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };

    start();

    carouselApi.on('pointerDown', stop);
    carouselApi.on('pointerUp', start);

    return () => {
      stop();
      carouselApi.off('pointerDown', stop);
      carouselApi.off('pointerUp', start);
    };
  }, [carouselApi]);

  // Vitrin için öne çıkan hikayeler (isFeatured), eksikse popülerlerle tamamla
  const featuredStories = stories.filter(s => s.isFeatured);
  const carouselStories =
    featuredStories.length >= 3
      ? featuredStories.slice(0, 3)
      : [...featuredStories, ...stories.filter(s => !s.isFeatured && s.isPopular).slice(0, 3 - featuredStories.length)];

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in duration-700">
      {/* Featured Carousel */}
      <section className="px-0">
        <Carousel className="w-full" opts={{ loop: true }} setApi={setCarouselApi}>
          <CarouselContent>
            {carouselStories.map((story, index) => (
              <CarouselItem key={story.id}>
                <div
                  className="relative aspect-[16/10] mx-4 rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/5 cursor-pointer group"
                  onClick={() => onSelectStory(story)}
                >
                  <Image
                    src={story.imageUrl}
                    alt={story.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    data-ai-hint="aesthetic banner"
                  />
                  {/* Gradient overlay — alttan koyulaşan, yazılar net okunur */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* İçerik katmanı */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    {/* Sol üst: tür etiketi */}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                        {story.category}
                      </Badge>
                    </div>

                    {/* Sol alt: hikaye adı + yazar */}
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-headline font-bold text-white leading-tight truncate">
                          {story.title}
                        </h2>
                        <p className="text-white/70 text-xs sm:text-sm mt-0.5">{story.author}</p>
                      </div>
                      {/* Sağ alt: İncele butonu */}
                      <button
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium border border-white/20 hover:bg-white/25 transition-all active:scale-95"
                        onClick={(e) => { e.stopPropagation(); onSelectStory(story); }}
                      >
                        İncele
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* Pagination Dots */}
          {totalSlides > 1 && (
            <div className="absolute bottom-4 right-7 flex gap-2 z-10">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); carouselApi?.scrollTo(i); }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === currentSlide
                      ? 'bg-white scale-100 shadow-sm'
                      : 'bg-white/40 scale-75 hover:bg-white/60'
                  )}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
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
          <Link href="/popular" className="text-xs font-medium text-primary cursor-pointer hover:underline">Tümünü Gör</Link>
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
