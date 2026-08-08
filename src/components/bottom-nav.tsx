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
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none px-3 sm:px-5 pb-[max(10px,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Ana gezinme"
        className="pointer-events-auto max-w-md mx-auto h-[68px] rounded-[24px] glass-morphism px-2 flex items-center gap-1 shadow-[0_18px_55px_rgba(0,0,0,0.26)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex-1 min-w-0 h-12 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 outline-none active:scale-[0.96]',
                isActive
                  ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <span
                className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300',
                  isActive && 'bg-primary/12 active-nav-glow'
                )}
              >
                <Icon className={cn('w-5 h-5 transition-transform duration-300', isActive && 'stroke-[2.4px] scale-105')} />
              </span>

              <span
                className={cn(
                  'hidden min-[360px]:block text-[11px] font-extrabold tracking-tight truncate transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </span>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
