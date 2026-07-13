'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';
import { Story } from '@/lib/types';
import { StoryCard } from '@/components/story-card';
import { stories as mockStories } from '@/lib/mock-data';
import { onStoriesSnapshot, seedStoriesToFirestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function PopularPage() {
  const [stories, setStories] = useState<Story[]>(mockStories);
  const [isLoading, setIsLoading] = useState(true);
  const seedAttempted = useRef(false);

  useEffect(() => {
    const unsub = onStoriesSnapshot((firestoreStories) => {
      if (firestoreStories.length > 0) {
        setStories(firestoreStories);
      } else if (!seedAttempted.current) {
        seedAttempted.current = true;
        seedStoriesToFirestore(mockStories, []).then(() => {
          setStories(mockStories);
        }).catch(() => {
          setStories(mockStories);
        });
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const popularStories = stories.filter(s => s.isPopular);

  return (
    <div className="min-h-dvh bg-[#fcf8ff] dark:bg-[#0D0E12]">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-border/40 bg-white/80 dark:bg-[#0D0E12]/90 dark:border-zinc-800">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50 dark:hover:bg-white/5 transition-colors active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-accent dark:text-zinc-100" />
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h1 className="text-lg font-headline font-bold text-accent dark:text-white">Popüler</h1>
          </div>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {popularStories.length} hikaye
          </span>
        </div>
      </header>

      {/* Grid */}
      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : popularStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Flame className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Henüz popüler hikaye yok</p>
            <Link href="/" className="text-xs text-primary hover:underline mt-2">
              Keşfet sayfasına dön
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-in fade-in duration-500">
            {popularStories.map(story => (
              <StoryCard key={story.id} story={story} variant="popular" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
