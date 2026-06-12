'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500); // 2 seconds pulse + 0.5s fade
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-[#1D1231] via-[#0B070F] to-[#1D1231] flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards delay-[2000ms]">
      <div className="relative flex flex-col items-center gap-6 animate-in zoom-in-95 duration-1000">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 animate-pulse" />
        <div className="relative w-24 h-24 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl animate-pulse-subtle">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter leading-none">Aura</h1>
          <span className="text-xs uppercase font-bold tracking-[0.4em] text-primary mt-1">Stories</span>
        </div>
      </div>
    </div>
  );
}
