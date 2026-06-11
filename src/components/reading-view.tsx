
'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/lib/types';
import { ArrowLeft, Type, Lock, Coins, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReadingViewProps {
  story: Story;
  onBack: () => void;
}

export function ReadingView({ story, onBack }: ReadingViewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const paragraphs = [
    "Gece, İstanbul'un üzerine bir yorgan gibi serilmişti. Sokak lambalarının cılız ışığı, ıslak kaldırımlarda titrek yansımalar oluşturuyordu. Genç kadın, elindeki eski anahtarı titreyen parmaklarıyla kapı kilidine soktu. İçeriden gelen küf ve toz kokusu, yıllardır açılmamış bir sırrın habercisiydi.",
    "Adımını içeri attığında, zemindeki tahtaların gıcırtısı sessizliği bıçak gibi kesti. Kalbi göğüs kafesine sığmıyordu. Burası, dedesinin ona miras bıraktığı, ancak vasiyetinde 'asla açma' dediği o odaydı. Merak, korkudan her zaman daha ağır basardı.",
    "Masanın üzerindeki gaz lambasını yaktı. Işığın yayılmasıyla birlikte odanın köşelerinde saklanan gölgeler geri çekildi. Tam karşısında duran devasa yağlı boya tablo, sanki onu izliyordu. Tablodaki adamın gözleri, canlıymışçasına derin bir hüzün ve öfke barındırıyordu.",
    "Parmağını tablonun çerçevesinde gezdirdiğinde, eline sert bir çıkıntı çarptı. Bir düğme ya da bir kilit mekanizması olabilir miydi? Hafifçe bastırdığında, tablonun arkasındaki duvar yavaşça yana kaydı. Gizli bir bölme... Ve içinde deri ciltli, üzerinde gümüş bir mühür bulunan o defter.",
    "Mühürü kırmak için elini uzattığında, dışarıdan gelen ani bir fren sesiyle irkildi. Siyah bir lüks araç konağın önünde durmuştu. İçinden çıkan uzun boylu, pardösülü adamın bakışları doğrudan bu odanın penceresine odaklanmıştı. O an anladı ki, bu defter sadece bir anı değil, tehlikeli bir oyunun ilk parçasıydı.",
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#FDFBF7] overflow-y-auto no-scrollbar animate-in fade-in duration-500">
      {/* Top Minimalist Header */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-border/20 px-6 flex items-center justify-between transition-transform duration-300 max-w-md mx-auto",
          !isVisible ? "-translate-y-full" : "translate-y-0"
        )}
      >
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-accent hover:bg-black/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bölüm 1</span>
          <h2 className="text-sm font-headline font-bold text-accent truncate max-w-[200px]">Teslimiyet</h2>
        </div>
        <button className="p-2 -mr-2 text-accent hover:bg-black/5 rounded-full transition-colors">
          <Type className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <article className="pt-24 px-8 pb-12 max-w-md mx-auto">
        <h1 className="text-3xl font-headline font-black text-accent mb-8 leading-tight">
          Bölüm 1: Teslimiyet
        </h1>

        <div className="space-y-6 relative">
          {paragraphs.slice(0, 4).map((p, i) => (
            <p key={i} className="font-serif text-lg leading-relaxed text-foreground/90 first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left">
              {p}
            </p>
          ))}

          {/* Fade Out Effect */}
          <div className="relative h-24 overflow-hidden pointer-events-none">
             <p className="font-serif text-lg leading-relaxed text-foreground/90">
               {paragraphs[4]}
             </p>
             <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/80 to-transparent" />
          </div>
        </div>

        {/* Premium Paywall Card */}
        <section className="mt-8 mb-32 animate-in slide-in-from-bottom-10 duration-700 delay-300">
           <div className="p-8 rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-primary/10 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                 <Lock className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-xl font-headline font-bold text-accent">Bu bölüm kilitli</h3>
                 <p className="text-sm text-muted-foreground px-4">Okumaya devam etmek ve hikayenin sonunu öğrenmek için kilidi açın.</p>
              </div>

              <div className="flex flex-col w-full gap-3">
                 <Button 
                   className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                 >
                   <Coins className="w-5 h-5" />
                   15 Jeton ile Aç
                 </Button>
                 <Button 
                   variant="outline"
                   className="w-full h-12 rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5 flex items-center justify-center gap-2"
                 >
                   <Play className="w-4 h-4 fill-current" />
                   Reklam İzle ve Ücretsiz Aç
                 </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Aura Premium ile tüm bölümler açık</p>
           </div>
        </section>
      </article>

      {/* Decorative footer */}
      <footer className="h-24 bg-[#FDFBF7]" />
    </div>
  );
}
