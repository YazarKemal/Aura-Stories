
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
  Star,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VIPScreenProps {
  onBack: () => void;
}

export function VIPScreen({ onBack }: VIPScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState('6months');

  const perks = [
    { id: 1, title: 'Reklamsız Deneyim', desc: 'Kesintisiz okuma keyfi', icon: ShieldCheck, color: 'text-blue-400' },
    { id: 2, title: 'Aylık 500 Hediye Jeton', desc: 'Her ay cüzdanına eklenir', icon: Coins, color: 'text-amber-400' },
    { id: 3, title: 'Bölümlere Erken Erişim', desc: 'Herkesten önce oku', icon: Clock, color: 'text-purple-400' },
    { id: 4, title: 'Özel VIP Profil Çerçevesi', desc: 'Toplulukta fark edil', icon: Gem, color: 'text-pink-400' },
  ];

  const plans = [
    { id: 'monthly', title: 'Aylık', price: '49,99 TL', subtitle: 'Esnek Plan' },
    { id: '6months', title: '6 Aylık', price: '249,99 TL', subtitle: '%20 Avantajlı', popular: true },
    { id: 'yearly', title: 'Yıllık', price: '449,99 TL', subtitle: '%40 Avantajlı' },
  ];

  return (
    <div className="fixed inset-0 z-[450] bg-[#0F071A] flex flex-col animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
      {/* Premium Background Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#1A0B2E] via-[#0F071A] to-[#12081E]">
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] bg-accent/20 blur-[120px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 p-6 flex items-center justify-between">
        <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 px-3 py-1 text-[10px] font-black tracking-widest uppercase">AURA PREMIUM</Badge>
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="relative z-10 px-8 pb-32 flex flex-col gap-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] border-2 border-white/20">
              <Crown className="w-12 h-12 text-[#1A0B2E] drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter leading-none">Aura VIP Ol</h1>
          <p className="text-white/60 text-sm max-w-[280px]">Sınırları kaldırın ve hikayelerin en premium halini keşfedin.</p>
        </div>

        {/* Perks Grid */}
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

        {/* Pricing Tiers */}
        <section className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2 text-center">PLANINI SEÇ</h3>
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "p-5 rounded-3xl transition-all duration-300 cursor-pointer border-2 relative overflow-hidden",
                  selectedPlan === plan.id 
                    ? "bg-primary/20 border-amber-400 shadow-[0_10px_30px_rgba(155,103,212,0.2)]" 
                    : "bg-white/5 border-white/10 hover:border-white/20"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-amber-400 text-[#1A0B2E] text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">POPÜLER</div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-black uppercase tracking-widest",
                      selectedPlan === plan.id ? "text-white" : "text-white/60"
                    )}>{plan.title}</span>
                    <span className="text-[10px] text-amber-400 font-bold">{plan.subtitle}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-white">{plan.price}</span>
                    {selectedPlan === plan.id && <Sparkles className="w-3 h-3 text-amber-400 mt-1 animate-pulse" />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Safety & Legal */}
        <div className="text-center space-y-2 opacity-40">
           <p className="text-[9px] text-white leading-relaxed">Aboneliğiniz otomatik olarak yenilenir. İstediğiniz zaman uygulama ayarlarından iptal edebilirsiniz.</p>
           <div className="flex justify-center gap-4 text-[9px] font-bold text-white uppercase tracking-tighter">
             <span>Kullanım Koşulları</span>
             <span>Gizlilik Politikası</span>
           </div>
        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-8 pt-4 bg-gradient-to-t from-[#0F071A] via-[#0F071A] to-transparent z-[460] max-w-md mx-auto">
        <Button 
          className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-[#1A0B2E] text-xl font-black shadow-[0_15px_40px_rgba(251,191,36,0.4)] hover:scale-[1.02] active:scale-95 transition-all animate-pulse-subtle"
        >
          Şimdi VIP Ol
        </Button>
      </div>
    </div>
  );
}
