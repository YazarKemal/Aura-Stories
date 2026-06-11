
'use client';

import { Search, Bell, Sparkles, Coins, Trophy } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HeaderProps {
  onSearchClick?: () => void;
}

const NOTIFICATIONS = [
  {
    id: 1,
    title: "Yeni Bölüm",
    message: "'Teslimiyet' yayımlandı! Hemen Oku",
    icon: Sparkles,
    color: "text-blue-500 bg-blue-50",
    time: "2s önce"
  },
  {
    id: 2,
    title: "Hediye Alındı",
    message: "Bir okuyucu hikayene 50🪙 Kahve hediye etti!",
    icon: Coins,
    color: "text-amber-500 bg-amber-50",
    time: "5s önce"
  },
  {
    id: 3,
    title: "Hedef Tamamlandı",
    message: "Haftalık okuma hedefine ulaştın!",
    icon: Trophy,
    color: "text-primary bg-primary/10",
    time: "1g önce"
  }
];

export function Header({ onSearchClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between max-w-md mx-auto glass-morphism rounded-b-[2rem] shadow-sm">
      <div className="flex flex-col">
        <h1 className="text-2xl font-headline font-black text-primary tracking-tighter leading-none">Aura</h1>
        <span className="text-[10px] uppercase font-bold tracking-widest text-accent opacity-60">Stories</span>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onSearchClick}
          className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm border border-primary/20"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <Popover>
          <PopoverTrigger asChild>
            <div className="relative">
              <button className="p-2.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95">
                <Bell className="w-5 h-5" />
              </button>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-[2rem] border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden" align="end" sideOffset={12}>
            <div className="p-6 bg-gradient-to-br from-primary to-accent">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Bildirimler</h3>
                <Badge className="bg-white/20 text-white border-none text-[10px]">3 Yeni</Badge>
              </div>
            </div>
            <ScrollArea className="h-[320px]">
              <div className="p-4 flex flex-col gap-2">
                {NOTIFICATIONS.map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div key={notif.id} className="p-4 rounded-2xl hover:bg-muted/30 transition-colors flex gap-4 items-start cursor-pointer border border-transparent hover:border-border/50">
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${notif.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-accent leading-none">{notif.title}</h4>
                        <p className="text-xs text-muted-foreground leading-tight">{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground/60 font-medium">{notif.time}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border/10 text-center">
              <button className="text-xs font-bold text-primary hover:underline">Tümünü Gör</button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
