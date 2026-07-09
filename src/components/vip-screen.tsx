'use client';

import { useState } from 'react';
import {
  Crown,
  X,
  ShieldCheck,
  Zap,
  Gem,
  Coins,
  Clock,
  Check,
  Gift,
  Sparkles,
  Tv
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdRewardModal } from '@/components/ad-reward-modal';
import { useUserState } from '@/lib/user-state';

interface VIPScreenProps {
  onBack: () => void;
}

export function VIPScreen({ onBack }: VIPScreenProps) {
  const { userState, recordVipAdWatch, setVipTier, resetVipProgress } = useUserState();
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [vipUnlocked, setVipUnlocked] = useState(false);

  const adsWatched = userState.vipAdsWatched;
  const selectedTier = userState.vipSelectedTier;

  const handleAdReward = (amount: number) => {
    recordVipAdWatch();
    const next = adsWatched + 1;

    // Seçili kademenin reklam hedefine ulaşıldı mı?
    const tier = adTiers.find(t => t.id === selectedTier);
    if (tier && next >= tier.ads) {
      setVipUnlocked(true);
      setTimeout(() => {
        resetVipProgress();
        setVipUnlocked(false);
      }, 3000);
    }
  };

  const perks = [
    { id: 1, title: 'Reklamsız Deneyim', desc: 'Kesintisiz okuma keyfi', icon: ShieldCheck, color: 'text-blue-400' },
    { id: 2, title: 'Aylık 500 Hediye Jeton', desc: 'Her ay cüzdanına eklenir', icon: Coins, color: 'text-amber-400' },
    { id: 3, title: 'Bölümlere Erken Erişim', desc: 'Herkesten önce oku', icon: Clock, color: 'text-purple-400' },
    { id: 4, title: 'Özel VIP Profil Çerçevesi', desc: 'Toplulukta fark edil', icon: Gem, color: 'text-pink-400' },
  ];

  const adTiers = [
    { id: '1day', title: '1 Günlük VIP', ads: 2, reward: '+50 Jeton', popular: false },
    { id: '7days', title: '7 Günlük VIP', ads: 10, reward: '+200 Jeton', popular: true },
    { id: '30days', title: '30 Günlük VIP', ads: 30, reward: '+500 Jeton', popular: false },
  ];

  return (
    <div className="fixed inset-0 z-[450] bg-[#0F071A] flex flex-col animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
      {/* Premium Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#1A0B2E] via-[#0F071A] to-[#12081E]">
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] bg-accent/20 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 p-6 flex items-center justify-between">
        <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 px-3 py-1 text-[10px] font-black tracking-widest uppercase">AURA PREMIUM</Badge>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="relative z-10 px-8 pb-32 flex flex-col gap-10">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] border-2 border-white/20">
              <Crown className="w-12 h-12 text-[#1A0B2E] drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter leading-none">Aura VIP Ol</h1>
          <p className="text-white/60 text-sm max-w-[280px]">Reklam izleyerek VIP ayrıcalıkları kazan. Hiçbir ödeme yok!</p>
        </div>

        {/* Perks */}
        <section className="grid grid-cols-1 gap-4">
          <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2 text-center">VIP AYRICALIKLARI</h3>
          <div className="grid grid-cols-1 gap-3">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5", perk.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{perk.title}</span>
                    <span className="text-[10px] text-white/50">{perk.desc}</span>
                  </div>
                  <div className="ml-auto">
                    <Check className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ad-Watch Tiers */}
        <section className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2 text-center">REKLAM İZLEYEREK VIP KAZAN</h3>
          <div className="flex flex-col gap-3">
            {adTiers.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const progress = isSelected ? adsWatched : 0;
              const pct = Math.min(100, Math.round((progress / tier.ads) * 100));
              return (
                <div
                  key={tier.id}
                  onClick={() => { setVipTier(tier.id); setVipUnlocked(false); }}
                  className={cn(
                    "p-5 rounded-3xl transition-all duration-300 border-2 relative overflow-hidden cursor-pointer active:scale-[0.98]",
                    isSelected
                      ? "bg-primary/20 border-amber-400 shadow-[0_10px_30px_rgba(155,103,212,0.2)]"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-amber-400 text-[#1A0B2E] text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">EN AVANTAJLI</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-widest text-white">{tier.title}</span>
                      <span className="text-[10px] text-amber-400 font-bold">{tier.ads} reklam izle → {tier.reward}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && progress > 0 && (
                        <span className="text-xs font-black text-amber-400">{progress}/{tier.ads}</span>
                      )}
                      <Tv className={cn("w-5 h-5", isSelected ? "text-amber-400" : "text-white/30")} />
                    </div>
                  </div>
                  {/* Progress bar (visible when selected) */}
                  {isSelected && (
                    <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* VIP Unlocked Banner */}
        {vipUnlocked && (
          <div className="p-4 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-center animate-in fade-in zoom-in-95 duration-300">
            <p className="text-amber-400 font-black text-sm">🎉 Tebrikler! VIP Kazanıldı!</p>
            <p className="text-amber-300/70 text-[10px] mt-1">VIP ayrıcalıkların aktif edildi.</p>
          </div>
        )}

        {/* Info */}
        <div className="text-center space-y-2 opacity-40">
           <p className="text-[9px] text-white leading-relaxed">Bir kademe seç, reklam izleyerek ilerle. Hedefe ulaşınca VIP süren hesabına eklenir.</p>
           <div className="flex justify-center gap-4 text-[9px] font-bold text-white uppercase tracking-tighter">
             <span>Kullanım Koşulları</span>
             <span>Gizlilik Politikası</span>
           </div>
        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-8 pt-4 bg-gradient-to-t from-[#0F071A] via-[#0F071A] to-transparent z-[460] max-w-md mx-auto">
        {vipUnlocked ? (
          <Button
            onClick={onBack}
            className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-green-400 to-emerald-600 text-white text-xl font-black shadow-[0_15px_40px_rgba(52,211,153,0.4)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Sparkles className="w-6 h-6" />
            VIP Aktif — Keşfetmeye Dön
          </Button>
        ) : (
          <Button
            onClick={() => setIsAdModalOpen(true)}
            className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-[#1A0B2E] text-xl font-black shadow-[0_15px_40px_rgba(251,191,36,0.4)] hover:scale-[1.02] active:scale-95 transition-all animate-pulse-subtle flex items-center justify-center gap-3"
          >
            <Tv className="w-6 h-6" />
            Reklam İzle ({adsWatched}/{adTiers.find(t => t.id === selectedTier)?.ads || '?'})
          </Button>
        )}
      </div>

      <AdRewardModal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} onReward={handleAdReward} />
    </div>
  );
}
