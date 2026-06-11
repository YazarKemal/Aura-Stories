
'use client';

import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LibraryScreenProps {
  onNavigateToDiscover: () => void;
}

export function LibraryScreen({ onNavigateToDiscover }: LibraryScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState('Varsayılan');
  const subTabs = ['Varsayılan', 'Yeni', 'İlerleme'];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Sub-navigation Tabs */}
      <section className="px-6 mb-8">
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl border border-border/50">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300",
                activeSubTab === tab 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-accent"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Empty State Content */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8 min-h-[50vh]">
        {/* Stylized Illustration Placeholder */}
        <div className="relative">
          <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] rotate-6 flex items-center justify-center animate-pulse">
            <div className="w-24 h-24 bg-primary/20 rounded-[2rem] -rotate-12 flex items-center justify-center border-2 border-white shadow-lg">
              <BookOpen className="w-10 h-10 text-primary opacity-60" />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md animate-bounce">
            <span className="text-xl">💜</span>
          </div>
        </div>

        <div className="space-y-3 max-w-[240px]">
          <h3 className="text-xl font-headline font-black text-accent">Kitaplığınız Henüz Boş</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kitaplığınıza henüz hikaye eklemediniz. Keşfetmeye ne dersiniz?
          </p>
        </div>

        <Button 
          onClick={onNavigateToDiscover}
          variant="outline"
          className="rounded-full border-primary text-primary font-bold px-8 h-12 hover:bg-primary/5 active:scale-95 transition-all flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Hemen Keşfet
        </Button>
      </section>
    </div>
  );
}
