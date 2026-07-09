
'use client';

import { Book, Compass, Gift, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'library', label: 'Kitaplık', icon: Book },
  { id: 'discover', label: 'Keşfet', icon: Compass },
  { id: 'rewards', label: 'Ödüller', icon: Gift },
  { id: 'profile', label: 'Ben', icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 glass-morphism dark:bg-brand-card dark:border-zinc-800 border-t border-white/20 px-6 pt-2 pb-6 z-50 flex items-center justify-between rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center flex-1 gap-1 group relative outline-none"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isActive ? "text-primary bg-primary/10 active-nav-glow" : "text-muted-foreground group-hover:text-primary/60"
            )}>
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-tight transition-colors duration-300",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
