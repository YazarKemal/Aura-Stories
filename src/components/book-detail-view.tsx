
'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/lib/types';
import { ArrowLeft, Star, Eye, Share2, Bookmark, Sparkles, MessageCircle, Trophy, CloudDownload, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BookDetailViewProps {
  story: Story;
  onBack: () => void;
  onStartReading: () => void;
  onOpenChat: () => void;
}

export function BookDetailView({ story, onBack, onStartReading, onOpenChat }: BookDetailViewProps) {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>(
    story.isDownloaded ? 'completed' : 'idle'
  );
  const [progress, setProgress] = useState(0);

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    
    setDownloadState('downloading');
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setDownloadState('completed');
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 400);
  };

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
            className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent hover:bg-white active:scale-90 transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent active:scale-90 transition-all">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-accent active:scale-90 transition-all">
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
              className="object-cover transition-transform duration-700 hover:scale-105"
              data-ai-hint="book cover detail"
            />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 -mt-8 relative z-10 pb-40 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300">
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <h1 className="text-3xl font-headline font-black text-accent leading-tight">
            {story.title}
          </h1>
          
          <div className="flex items-center gap-2">
            <p className="text-primary font-bold text-lg">{story.author}</p>
            <Badge className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-none text-[8px] font-black px-1.5 h-4 flex items-center gap-1 shadow-sm">
              <Trophy className="w-2.5 h-2.5" />
              ALTIN YAZAR
            </Badge>
          </div>
          
          <div className="flex items-center gap-6 mt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-brand-primary">
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

        {/* Action Buttons Row */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button 
            onClick={handleDownload}
            variant="outline"
            className={cn(
              "rounded-full px-6 h-12 font-bold transition-all border-2",
              downloadState === 'completed' 
                ? "border-green-500 text-green-600 bg-green-50" 
                : "border-primary/20 text-primary hover:border-primary"
            )}
          >
            {downloadState === 'idle' && (
              <>
                <CloudDownload className="w-4 h-4 mr-2" />
                Çevrimdışı İndir
              </>
            )}
            {downloadState === 'downloading' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                İndiriliyor... %{progress}
              </>
            )}
            {downloadState === 'completed' && (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                İndirildi
              </>
            )}
          </Button>
        </div>

        {/* AI Character Chat Card */}
        <Card 
          onClick={onOpenChat}
          className="mb-8 p-6 rounded-[2rem] bg-gradient-to-br from-accent via-primary to-accent border-none shadow-xl shadow-primary/20 cursor-pointer active:scale-[0.98] transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
             <Sparkles className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/30">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg">Karakter Odası</h3>
                <Badge className="bg-brand-primary text-white border-none text-[8px] font-black px-1.5 h-3.5">YENİ</Badge>
              </div>
              <p className="text-white/70 text-xs font-medium">Başrol karakteriyle hemen sohbete başla!</p>
            </div>
          </div>
        </Card>

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
          onClick={onStartReading}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 animate-pulse-subtle"
        >
          Okumaya Başla
        </Button>
      </div>
    </div>
  );
}
