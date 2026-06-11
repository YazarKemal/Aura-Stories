
'use client';

import { 
  ArrowLeft, 
  Eye, 
  Users, 
  Coins, 
  Plus, 
  TrendingUp, 
  MessageSquare, 
  Heart, 
  BarChart3, 
  Edit3, 
  MoreVertical,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { stories } from '@/lib/mock-data';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WriterDashboardProps {
  onBack: () => void;
}

const DASHBOARD_METRICS = [
  { id: 'reads', label: 'Toplam Okunma', value: '1.2M', icon: Eye, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { id: 'followers', label: 'Takipçiler', value: '14.5K', icon: Users, color: 'text-primary bg-primary/10 dark:bg-primary/20' },
  { id: 'earnings', label: 'Kazanç', value: '125,000', icon: Coins, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', isCoins: true },
];

const RECENT_INTERACTIONS = [
  { id: 1, user: 'Ayşe', action: '4. Bölüme 50🪙 Kahve hediye etti!', time: '2s önce', type: 'gift' },
  { id: 2, user: 'KitapKurdu', action: 'yeni bir yorum bıraktı: "Harika bir kurgu!"', time: '15d önce', type: 'comment' },
  { id: 3, user: 'Melih_7', action: 'hikayeni kütüphanesine ekledi.', time: '1s önce', type: 'library' },
];

export function WriterDashboard({ onBack }: WriterDashboardProps) {
  // Mocking author's own stories
  const myWorks = stories.slice(0, 3);

  return (
    <div className="fixed inset-0 z-[250] bg-background overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-500">
      {/* Immersive Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl px-6 py-5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-accent hover:bg-muted/50 rounded-full transition-colors active:scale-90"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <h2 className="font-headline font-black text-accent text-xl leading-none">Yazar Stüdyosu</h2>
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Creator Pro</span>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white border-none text-[10px] font-black px-3 py-1">
          <Sparkles className="w-3 h-3 mr-1" />
          ALTIN YAZAR
        </Badge>
      </header>

      <div className="p-6 pb-40 flex flex-col gap-8 max-w-md mx-auto">
        {/* Key Metrics Grid */}
        <section className="grid grid-cols-1 gap-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Performans Özeti
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {DASHBOARD_METRICS.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.id} className="p-4 rounded-[1.5rem] border-none bg-white dark:bg-card shadow-sm flex flex-col items-center text-center gap-2 group hover:scale-[1.02] transition-transform cursor-pointer">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", metric.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5 justify-center">
                      <span className="text-lg font-black text-accent leading-none">{metric.value}</span>
                      {metric.isCoins && <Coins className="w-3 h-3 text-amber-500 fill-current" />}
                    </div>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter leading-tight mt-1">{metric.label}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Action Button: Publish New Chapter */}
        <section>
          <Button 
            className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-primary via-accent to-primary text-white text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all animate-pulse-subtle flex items-center justify-center gap-3"
          >
            <Edit3 className="w-6 h-6" />
            Yeni Bölüm Yayımla
          </Button>
        </section>

        {/* My Works (Horizontally Scrolling) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Eserlerim
            </h3>
            <Button variant="link" className="text-[10px] font-bold text-primary h-auto p-0">Tümünü Gör</Button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-4">
              {myWorks.map((story) => (
                <div key={story.id} className="inline-block w-36 group cursor-pointer">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-white/10 mb-2">
                    <Image 
                      src={story.imageUrl} 
                      alt={story.title} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                       <button className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
                          <Edit3 className="w-5 h-5" />
                       </button>
                       <button className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
                          <BarChart3 className="w-5 h-5" />
                       </button>
                    </div>
                    <div className="absolute top-2 right-2">
                       <button className="p-1 rounded-full bg-black/20 backdrop-blur-md text-white">
                          <MoreVertical className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-accent truncate">{story.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-primary">{(story.readCount / 1000).toFixed(0)}k Okunma</span>
                  </div>
                </div>
              ))}
              {/* Add New Story Placeholder */}
              <div className="inline-block w-36">
                <div className="aspect-[2/3] rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:bg-primary/10 transition-colors">
                  <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Yeni Eser</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </section>

        {/* Recent Interactions Feed */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Son Etkileşimler
          </h3>
          <Card className="rounded-[2.5rem] border-none bg-white dark:bg-card shadow-sm overflow-hidden">
            <div className="flex flex-col">
              {RECENT_INTERACTIONS.map((item, index) => (
                <div key={item.id}>
                  <div className="p-5 flex gap-4 items-start hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      item.type === 'gift' ? "bg-amber-50 text-amber-500" : (item.type === 'comment' ? "bg-blue-50 text-blue-500" : "bg-primary/10 text-primary")
                    )}>
                      {item.type === 'gift' && <Coins className="w-5 h-5" />}
                      {item.type === 'comment' && <MessageSquare className="w-5 h-5" />}
                      {item.type === 'library' && <Plus className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-accent leading-none">{item.user}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.action}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-1 transition-transform self-center" />
                  </div>
                  {index < RECENT_INTERACTIONS.length - 1 && <div className="mx-6 border-b border-border/30" />}
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full h-12 rounded-none text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
              Tümünü Gör
            </Button>
          </Card>
        </section>
      </div>
    </div>
  );
}
