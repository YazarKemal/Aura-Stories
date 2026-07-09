
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, CloudDownload, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { stories as mockStories } from '@/lib/mock-data';
import { StoryCard } from './story-card';
import { Story } from '@/lib/types';
import { getStories, onStoriesSnapshot } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface LibraryScreenProps {
  onNavigateToDiscover: () => void;
  onSelectStory?: (story: Story) => void;
}

export function LibraryScreen({ onNavigateToDiscover, onSelectStory }: LibraryScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState('Varsayılan');
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onStoriesSnapshot((fs) => {
      setStories(fs.length > 0 ? fs : mockStories);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);
  const subTabs = ['Varsayılan', 'Yeni', 'İlerleme', 'İndirilenler'];

  const filteredStories = stories.filter(story => {
    if (activeSubTab === 'İndirilenler') return story.isDownloaded;
    // For prototype simplicity, other tabs show a selection
    if (activeSubTab === 'Yeni') return story.status === 'ongoing';
    return true;
  });

  // Since mock data is static, let's assume "Varsayılan" starts with something if we want to test
  const displayStories = activeSubTab === 'Varsayılan' ? [] : filteredStories;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Sub-navigation Tabs */}
      <section className="px-6 mb-8">
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                activeSubTab === tab 
                  ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                  : "text-muted-foreground dark:text-zinc-400 hover:text-accent dark:hover:text-zinc-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Library Content */}
      <section className="flex-1 px-6 pb-24">
        {displayStories.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-accent">{activeSubTab} Kitaplarım</h3>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isLoading ? '...' : `${displayStories.length} Kitap`}</span>
            </div>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/80 border border-border animate-pulse">
                  <Skeleton className="h-32 w-24 rounded-lg" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))
            ) : displayStories.map(story => (
              <StoryCard 
                key={story.id} 
                story={story} 
                variant="recommended" 
                onClick={onSelectStory} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-8 text-center gap-8 min-h-[50vh]">
            {/* Stylized Illustration Placeholder */}
            <div className="relative">
              <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] rotate-6 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 bg-primary/20 rounded-[2rem] -rotate-12 flex items-center justify-center border-2 border-white shadow-lg">
                  <BookOpen className="w-10 h-10 text-primary opacity-60" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <span className="text-xl">💜</span>
              </div>
            </div>

            <div className="space-y-3 max-w-[240px]">
              <h3 className="text-xl font-headline font-black text-accent">
                {activeSubTab === 'İndirilenler' ? 'Henüz İndirme Yok' : 'Kitaplığınız Boş'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeSubTab === 'İndirilenler'
                  ? 'Çevrimdışı okumak için hikayelerin detay sayfasından indirme yapabilirsiniz.'
                  : 'Kitaplığınıza henüz hikaye eklemediniz.'}
              </p>
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground/50 mt-2">
                <Library className="w-8 h-8" />
              </div>
              <Button
                onClick={onNavigateToDiscover}
                className="mt-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold active:scale-95 transition-all"
              >
                Keşfet'e Git
              </Button>
            </div>

            <Button 
              onClick={onNavigateToDiscover}
              variant="outline"
              className="rounded-full border-primary text-primary font-bold px-8 h-12 hover:bg-primary/5 active:scale-95 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Hemen Keşfet
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
