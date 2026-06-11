
'use client';

import { useState, useMemo } from 'react';
import { Search, X, Filter, ChevronRight, BookOpen } from 'lucide-react';
import { stories, categories } from '@/lib/mock-data';
import { Story } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [wordCount, setWordCount] = useState([100000]);

  const filterTags = ['Romantik', 'Mafya', 'İntikam', 'Dram', 'Fantastik', 'Gizem'];

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
    <div className="fixed inset-0 z-[400] bg-background flex flex-col animate-in fade-in duration-300">
      {/* Search Header */}
      <header className="p-6 flex flex-col gap-6 bg-white dark:bg-card border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hikaye, yazar veya #etiket ara..."
              className="pl-12 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
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
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-sm font-bold text-primary px-2"
          >
            Vazgeç
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Türler</span>
              <span className="text-[10px] font-bold text-primary">{selectedTags.length} Seçili</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                    selectedTags.includes(tag)
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                      : "bg-white dark:bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Durum</span>
              <div className="flex p-1 bg-muted/30 rounded-xl gap-1">
                {(['all', 'ongoing', 'completed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                      selectedStatus === status 
                        ? "bg-white dark:bg-card text-primary shadow-sm" 
                        : "text-muted-foreground"
                    )}
                  >
                    {status === 'all' ? 'Hepsi' : status === 'ongoing' ? 'Devam' : 'Bitti'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Maks. Kelime</span>
                <span className="text-[10px] font-bold text-primary">{(wordCount[0] / 1000).toFixed(0)}K</span>
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
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-accent">Arama Sonuçları</h3>
            <span className="text-xs text-muted-foreground">{filteredStories.length} Hikaye</span>
          </div>

          {filteredStories.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredStories.map(story => (
                <StoryCard key={story.id} story={story} variant="recommended" onClick={onSelectStory} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-accent">Sonuç Bulunamadı</h4>
                <p className="text-xs">Filtreleri değiştirerek tekrar deneyin.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
