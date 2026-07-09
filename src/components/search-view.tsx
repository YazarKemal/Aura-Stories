'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, BookOpen, Check } from 'lucide-react';
import { stories as mockStories } from '@/lib/mock-data';
import { Story } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { onStoriesSnapshot } from '@/lib/firebase';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StoryCard } from './story-card';
import { cn } from '@/lib/utils';

interface SearchViewProps {
  onBack: () => void;
  onSelectStory: (story: Story) => void;
}

export function SearchView({ onBack, onSelectStory }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState<Story[]>(mockStories);

  useEffect(() => {
    const unsub = onStoriesSnapshot((fs) => {
      if (fs.length > 0) setStories(fs);
    });
    return () => unsub();
  }, []);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [wordCount, setWordCount] = useState([100000]);

  const filterTags = ['Romantik', 'Mafya', '+18', 'İntikam', 'Dram', 'Fantastik'];

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesQuery = 
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.every(tag => story.tags?.includes(tag));

      const matchesStatus = 
        selectedStatus === 'all' || 
        story.status === selectedStatus;

      const matchesLength = story.wordCount <= wordCount[0];

      return matchesQuery && matchesTags && matchesStatus && matchesLength;
    });
  }, [searchQuery, selectedTags, selectedStatus, wordCount]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-[400] bg-background flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Search Header */}
      <header className="px-6 pt-8 pb-6 flex flex-col gap-6 bg-white dark:bg-zinc-900/80 dark:border-zinc-800 border-b border-border/50 shadow-sm relative">
        <button 
          onClick={onBack}
          className="absolute right-6 top-8 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-headline font-black text-accent">Gelişmiş Arama</h2>
          <p className="text-xs text-muted-foreground font-medium">Hikayenizi filtrelerle özelleştirin</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hikaye, yazar veya etiket ara..."
            className="pl-12 h-14 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 text-base"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-accent"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kategoriler</span>
            <div className="flex flex-wrap gap-2">
              {filterTags.map(tag => {
                const isActive = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5",
                      isActive
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                        : "bg-white dark:bg-zinc-800 border-border dark:border-zinc-700 text-muted-foreground dark:text-zinc-400 hover:border-primary/50"
                    )}
                  >
                    {isActive && <Check className="w-3 h-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Durum</span>
              <div className="flex p-1 bg-muted/40 rounded-2xl gap-1">
                {(['ongoing', 'completed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status === selectedStatus ? 'all' : status)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-tighter",
                      selectedStatus === status 
                        ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                        : "text-muted-foreground dark:text-zinc-400"
                    )}
                  >
                    {status === 'ongoing' ? 'Devam Ediyor' : 'Tamamlandı'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kelime Sayısı</span>
                <span className="text-[10px] font-black text-primary">{(wordCount[0] / 1000).toFixed(0)}B+</span>
              </div>
              <div className="pt-2">
                <Slider 
                  value={wordCount}
                  onValueChange={setWordCount}
                  min={10000}
                  max={500000}
                  step={10000}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-6 pb-32">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-accent">Bulunan Hikayeler</h3>
            <span className="text-xs text-muted-foreground font-medium">{filteredStories.length} Sonuç</span>
          </div>

          {filteredStories.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredStories.map(story => (
                <StoryCard key={story.id} story={story} variant="recommended" onClick={onSelectStory} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-accent text-lg">Sonuç Bulunamadı</h4>
                <p className="text-sm">Seçtiğiniz kriterlere uygun hikaye bulunamadı.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Floating Pulse Button */}
      <div className="fixed bottom-6 left-6 right-6 z-[410] animate-in slide-in-from-bottom-5 duration-500 delay-300">
        <Button 
          onClick={onBack}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-lg shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all animate-pulse-subtle"
        >
          Sonuçları Göster ({filteredStories.length})
        </Button>
      </div>
    </div>
  );
}
