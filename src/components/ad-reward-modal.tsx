'use client';

import { useState, useEffect } from 'react';
import { useUserState } from '@/lib/user-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Coins, Gift, Clock, Play, CheckCircle, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNetwork } from '@/hooks/use-network';

interface AdRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Reklam başarıyla izlendiğinde çağrılır (VIP kademe takibi için) */
  onReward?: (amount: number) => void;
}

type AdPhase = 'intro' | 'watching' | 'complete';

export function AdRewardModal({ isOpen, onClose, onReward }: AdRewardModalProps) {
  const { watchAd, isWatchingAd, userState } = useUserState();
  const { toast } = useToast();
  const { online } = useNetwork();
  const [phase, setPhase] = useState<AdPhase>('intro');
  const [countdown, setCountdown] = useState(5);
  const [reward, setReward] = useState(0);
  const [celebration, setCelebration] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      setCountdown(5);
      setReward(0);
      setCelebration(false);
    }
  }, [isOpen]);

  // Countdown timer during 'watching' phase
  useEffect(() => {
    if (phase !== 'watching' || countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleStartAd = async () => {
    setPhase('watching');

    try {
      const earned = await watchAd();
      onReward?.(earned);

      // Modal'ı hemen kapat, toast bildirimi göster
      onClose();
      setTimeout(() => {
        toast({
          title: `🎉 +${earned} Jeton Kazandınız!`,
          description: 'Jetonlar cüzdanına eklendi.',
        });
      }, 300);
    } catch {
      setPhase('intro');
    }
  };

  const handleClose = () => {
    if (phase === 'watching') return; // don't close during ad
    setCelebration(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90%] rounded-[2.5rem] p-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-[250]" overlayClassName="z-[250]">
        <DialogTitle className="sr-only">Reklam Ödülü</DialogTitle>
        {/* Header — dark mode: deep zinc, no cream */}
        <div className={cn(
          'relative p-8 pb-6 transition-colors duration-500',
          phase === 'complete' ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950' :
          phase === 'watching' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950' :
          'bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950'
        )}>
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Icon */}
            <div className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500',
              phase === 'complete' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 animate-bounce' :
              phase === 'watching' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
              'bg-zinc-100 dark:bg-zinc-800 text-brand-primary dark:text-amber-400'
            )}>
              {phase === 'complete' ? (
                <CheckCircle className="w-10 h-10" />
              ) : phase === 'watching' ? (
                <Tv className="w-10 h-10 animate-pulse" />
              ) : (
                <Gift className="w-10 h-10" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-headline font-black text-accent dark:text-zinc-100">
              {phase === 'complete'
                ? '🎉 Tebrikler!'
                : phase === 'watching'
                  ? `⏳ Reklam İzleniyor... ${countdown}s`
                  : 'Ücretsiz Jeton Kazan'}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground dark:text-zinc-400 leading-relaxed">
              {phase === 'complete'
                ? `Reklam izleyerek ${reward} Jeton kazandınız!`
                : phase === 'watching'
                  ? 'Lütfen bekleyin, reklamınız oynatılıyor...'
                  : 'Kısa bir reklam izleyerek ücretsiz jeton kazanabilirsiniz.'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 flex flex-col gap-4">
          {phase === 'intro' && (
            <>
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center gap-2 text-center">
                  <Clock className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">~5 Saniye</span>
                  <span className="text-[9px] text-blue-500 dark:text-blue-400/70">Kısa Reklam</span>
                </div>
                <div className="p-4 rounded-2xl bg-green-50 dark:bg-emerald-950/30 border border-green-100 dark:border-emerald-900/30 flex flex-col items-center gap-2 text-center">
                  <Coins className="w-6 h-6 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-green-700 dark:text-emerald-300">+5 veya +10</span>
                  <span className="text-[9px] text-green-500 dark:text-emerald-400/70">Jeton Ödülü</span>
                </div>
              </div>

              {/* Balance display */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 dark:bg-zinc-900/50 border border-border/30 dark:border-zinc-800">
                <span className="text-xs font-bold text-accent dark:text-zinc-300">Mevcut Bakiyen</span>
                <span className="flex items-center gap-1.5 text-sm font-black text-amber-600 dark:text-amber-400">
                  <Coins className="w-4 h-4 fill-amber-500" />
                  {userState.credits}
                </span>
              </div>

              {/* Start button — dark: purple/indigo gradient */}
              <button
                onClick={handleStartAd}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-purple-600 dark:to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/20 dark:shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                Reklamı İzle ve Jeton Kazan
              </button>

              <p className="text-[10px] text-center text-muted-foreground dark:text-zinc-500">
                Reklamlar, Aura Stories&apos;i ücretsiz tutmamıza yardımcı olur.
              </p>
            </>
          )}

          {phase === 'watching' && (
            <div className="flex flex-col items-center gap-6 py-4">
              {/* Ad simulation — dark: zinc tones */}
              <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 border border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                {/* Fake ad content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 animate-pulse">
                    <Tv className="w-16 h-16 text-gray-400 dark:text-zinc-500" />
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                      Sponsor İçerik
                    </span>
                  </div>
                </div>
                {/* Fake skip button */}
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/20 dark:bg-white/10 text-white text-[10px] font-bold">
                  {countdown} saniye sonra atlanabilir
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-zinc-700">
                  <div
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-purple-500 dark:to-indigo-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Cancel hint */}
              <p className="text-[10px] text-muted-foreground dark:text-zinc-500 text-center">
                Reklam bitene kadar lütfen bekleyin...
              </p>
            </div>
          )}

          {phase === 'complete' && (
            <div className="flex flex-col items-center gap-5 py-3 animate-in fade-in zoom-in-95 duration-300">
              {/* Celebration emoji row */}
              {celebration && (
                <div className="flex items-center gap-1 animate-bounce">
                  {['🎉', '✨', '🪙', '✨', '🎉'].map((emoji, i) => (
                    <span key={i} className="text-2xl" style={{ animationDelay: `${i * 100}ms` }}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Premium reward card */}
              <div className="w-full p-6 rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-gray-700 shadow-2xl dark:shadow-black/40 flex flex-col items-center gap-4">
                {/* Big gradient reward */}
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">+{reward}</span>
                  <Coins className="w-9 h-9 text-amber-400 fill-amber-400 animate-bounce" />
                </div>

                <span className="text-sm font-bold text-green-600 dark:text-emerald-400">
                  ✅ Jeton cüzdanına eklendi!
                </span>

                {/* New balance */}
                <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/5 border border-border/30 dark:border-gray-700">
                  <span className="text-xs font-bold text-muted-foreground dark:text-gray-400">Yeni Bakiye</span>
                  <span className="flex items-center gap-1.5 text-base font-black text-amber-600 dark:text-amber-400">
                    <Coins className="w-4 h-4 fill-amber-500" />
                    {userState.credits}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent dark:from-purple-600 dark:to-indigo-600 text-white font-bold shadow-lg shadow-primary/20 dark:shadow-purple-900/40 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Harika, Devam Et!
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
