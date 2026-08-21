'use client';

import { Search, Bell, Sparkles, Coins, Trophy } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HeaderProps {
  onSearchClick?: () => void;
}

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Yeni Bölüm',
    message: "'Teslimiyet' yayımlandı. Okumaya devam edebilirsin.",
    icon: Sparkles,
    color: 'text-violet-500 bg-violet-500/10',
    time: '2s önce',
  },
  {
    id: 2,
    title: 'Hediye Alındı',
    message: 'Bir okuyucu hikâyene 50 jetonluk Kahve hediye etti.',
    icon: Coins,
    color: 'text-amber-500 bg-amber-500/10',
    time: '5s önce',
  },
  {
    id: 3,
    title: 'Hedef Tamamlandı',
    message: 'Haftalık okuma hedefine ulaştın.',
    icon: Trophy,
    color: 'text-primary bg-primary/10',
    time: '1g önce',
  },
];

export function Header({ onSearchClick }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 pt-[max(10px,env(safe-area-inset-top))] pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto min-h-[64px] px-4 rounded-[24px] glass-morphism flex items-center justify-between shadow-[0_16px_44px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-9 rounded-[13px] bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,hsl(var(--primary)/0.32),transparent_52%)]" />
            <Sparkles className="relative z-10 w-[18px] h-[18px] text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] uppercase font-black tracking-[0.24em] text-muted-foreground leading-none mb-1">Aura</span>
            <h1 className="text-[19px] font-headline font-black tracking-[-0.035em] leading-none text-foreground truncate">Stories</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Ara"
            onClick={onSearchClick}
            className="aura-touch-target rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center hover:bg-primary/15 active:scale-95 transition-all"
          >
            <Search className="w-5 h-5" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Bildirimler"
                className="aura-touch-target relative rounded-2xl text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center justify-center active:scale-95 transition-all"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background shadow-[0_0_9px_hsl(var(--primary)/0.75)]" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[min(340px,calc(100vw-24px))] p-0 rounded-[28px] border border-border/60 shadow-2xl bg-background/96 backdrop-blur-2xl overflow-hidden"
              align="end"
              sideOffset={10}
            >
              <div className="relative p-5 overflow-hidden border-b border-border/40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,hsl(var(--primary)/0.18),transparent_48%)]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Aura Feed</span>
                    <h3 className="text-lg font-headline font-black text-foreground mt-1">Bildirimler</h3>
                  </div>
                  <Badge className="aura-premium-chip border-none">3 yeni</Badge>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="p-3 flex flex-col gap-1.5">
                  {NOTIFICATIONS.map((notif) => {
                    const Icon = notif.icon;
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        className="w-full p-3.5 rounded-[20px] hover:bg-muted/40 transition-colors flex gap-3 items-start text-left border border-transparent hover:border-border/50"
                      >
                        <span className={`w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center ${notif.color}`}>
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <strong className="text-[13px] font-extrabold text-foreground leading-none truncate">{notif.title}</strong>
                            <span className="text-[9px] text-muted-foreground/70 font-semibold whitespace-nowrap">{notif.time}</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-[1.45]">{notif.message}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border/40">
                <button type="button" className="w-full min-h-10 rounded-xl text-[11px] font-extrabold text-primary hover:bg-primary/8 transition-colors">
                  Tüm bildirimleri gör
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
