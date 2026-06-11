
'use client';

import { Search, Bell } from 'lucide-react';

interface HeaderProps {
  onSearchClick?: () => void;
}

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
          className="p-2.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
        >
          <Search className="w-5 h-5" />
        </button>
        <div className="relative">
          <button className="p-2.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95">
            <Bell className="w-5 h-5" />
          </button>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
        </div>
      </div>
    </header>
  );
}
