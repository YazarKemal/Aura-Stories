
'use client';

import { Story } from '@/lib/types';
import { ArrowLeft, Star, Eye, Share2, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BookDetailViewProps {
  story: Story;
  onBack: () => void;
}

export function BookDetailView({ story, onBack }: BookDetailViewProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-500">
      {/* Hero Section */}
      <section className="relative h-[420px] w-full flex items-center justify-center pt-12">
        {/* Blurred Background */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={story.imageUrl}
            alt="Blur background"
            fill
            className="object-cover blur-[80px] opacity-40 scale-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Book Cover */}
        <div className="relative z-0 group animate-in zoom-in-95 fade-in duration-700 delay-200">
          <div className="relative aspect-[2/3] w-48 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
            <Image
              src={story.imageUrl}
              alt={story.title}
              fill
              className="object-cover"
              data-ai-hint="book cover detail"
            />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 -mt-8 relative z-10 pb-32">
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <h1 className="text-3xl font-headline font-black text-accent leading-tight">
            {story.title}
          </h1>
          <p className="text-primary font-bold text-lg">{story.author}</p>
          
          <div className="flex items-center gap-6 mt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{story.rating || 4.8}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Puan</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-primary">
                <Eye className="w-4 h-4" />
                <span className="font-bold">{(story.readCount / 1000).toFixed(1)}k</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Okuma</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(story.tags || [story.category, 'Popüler', 'Sürükleyici']).map((tag, i) => (
            <Badge 
              key={tag + i} 
              className="bg-primary/10 text-primary border-none hover:bg-primary/20 transition-colors py-1.5 px-4 rounded-full text-xs font-bold"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Synopsis */}
        <div className="space-y-4">
          <h3 className="text-xl font-headline font-bold text-accent border-l-4 border-primary pl-3">Özet</h3>
          <div className="text-foreground/80 leading-relaxed text-base space-y-4 italic">
            {(story.longSynopsis || story.synopsis).split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pt-2 bg-gradient-to-t from-background via-background to-transparent z-[110]">
        <Button 
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Okumaya Başla
        </Button>
      </div>
    </div>
  );
}
