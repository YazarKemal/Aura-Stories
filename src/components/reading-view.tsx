
'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/lib/types';
import { ArrowLeft, Type, Lock, Coins, Play, Info, User, Sparkles, Timer, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import Image from 'next/image';

interface ReadingViewProps {
  story: Story;
  onBack: () => void;
}

interface LoreInfo {
  name: string;
  role: string;
  description: string;
  imageUrl: string;
}

const LORE_DATA: Record<string, LoreInfo> = {
  'Demir Ağa': {
    name: 'Demir Ağa',
    role: 'Konağın Lideri',
    description: 'Konağın en genç ve en gizemli lideri. Geçmişin karanlık sırlarını omuzlarında taşıyan, otoriter ama adaletli bir figür.',
    imageUrl: 'https://picsum.photos/seed/demir/400/600',
  }
};

export function ReadingView({ story, onBack }: ReadingViewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [selectedLore, setSelectedLore] = useState<LoreInfo | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);

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
    "Mühürü kırmak için elini uzattığında, dışarıdan gelen ani bir fren sesiyle irkildi. Siyah bir lüks araç konağın önünde durmuştu. İçinden çıkan Demir Ağa, ağır adımlarla kapıya yöneldi. O an anladı ki, bu defter sadece bir anı değil, tehlikeli bir oyunun ilk parçasıydı.",
  ];

  const renderParagraph = (text: string, index: number) => {
    if (text.includes('Demir Ağa')) {
      const parts = text.split('Demir Ağa');
      return (
        <p key={index} className="font-serif text-lg leading-relaxed text-foreground/90">
          {parts[0]}
          <span 
            onClick={() => setSelectedLore(LORE_DATA['Demir Ağa'])}
            className="text-primary font-bold underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-accent transition-colors"
          >
            Demir Ağa
          </span>
          {parts[1]}
        </p>
      );
    }

    return (
      <p key={index} className="font-serif text-lg leading-relaxed text-foreground/90 first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left">
        {text}
      </p>
    );
  };

  const handleVote = (option: string) => {
    setVotedOption(option);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#FDFBF7] overflow-y-auto no-scrollbar animate-in fade-in duration-500">
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-border/20 px-6 flex items-center justify-between transition-transform duration-300 max-w-md mx-auto",
          !isVisible ? "-translate-y-full" : "translate-y-0"
        )}
      >
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-accent hover:bg-black/5 rounded-full transition-colors active:scale-90"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bölüm 1</span>
          <h2 className="text-sm font-headline font-bold text-accent truncate max-w-[200px]">Teslimiyet</h2>
        </div>
        <button className="p-2 -mr-2 text-accent hover:bg-black/5 rounded-full transition-colors active:scale-90">
          <Type className="w-5 h-5" />
        </button>
      </header>

      <article className="pt-24 px-8 pb-12 max-w-md mx-auto">
        <h1 className="text-3xl font-headline font-black text-accent mb-8 leading-tight">
          Bölüm 1: Teslimiyet
        </h1>

        <div className="space-y-6 relative">
          {paragraphs.slice(0, 4).map((p, i) => renderParagraph(p, i))}

          <div className="relative h-24 overflow-hidden pointer-events-none">
             {renderParagraph(paragraphs[4], 4)}
             <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/80 to-transparent" />
          </div>
        </div>

        {/* Community Choice (Sen Seç) Card */}
        <section className="mt-12 mb-8 animate-in slide-in-from-bottom-5 duration-700">
          <div className="relative p-6 rounded-[2.5rem] bg-white border-2 border-primary/20 shadow-xl overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12">
               <Sparkles className="w-20 h-20 text-primary" />
            </div>

            <div className="flex flex-col gap-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                  <Timer className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Kapanışa: 12S 45D</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px] uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kaderini Belirle</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-headline font-black text-accent leading-tight">
                  Hikayenin Kaderini Belirle!
                </h3>
                <p className="text-sm text-muted-foreground font-medium italic">
                  "Sizce Defne gerçeği Demir'e itiraf etmeli mi?"
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {!votedOption ? (
                  <>
                    <Button 
                      onClick={() => handleVote('A')}
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-primary/30 text-accent font-bold hover:bg-primary/5 hover:border-primary transition-all flex justify-between px-6"
                    >
                      <span>Gerçeği İtiraf Etsin</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Coins className="w-3 h-3 fill-current" />
                        <span className="text-[10px]">10</span>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => handleVote('B')}
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-primary/30 text-accent font-bold hover:bg-primary/5 hover:border-primary transition-all flex justify-between px-6"
                    >
                      <span>Sırrını Saklasın</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Coins className="w-3 h-3 fill-current" />
                        <span className="text-[10px]">10</span>
                      </div>
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-accent mb-1 px-1">
                        <span>Gerçeği İtiraf Etsin</span>
                        <span className={cn(votedOption === 'A' ? "text-primary" : "text-muted-foreground")}>65%</span>
                      </div>
                      <Progress value={65} className={cn("h-3 rounded-full", votedOption === 'A' ? "bg-primary/10" : "bg-muted")} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-accent mb-1 px-1">
                        <span>Sırrını Saklasın</span>
                        <span className={cn(votedOption === 'B' ? "text-primary" : "text-muted-foreground")}>35%</span>
                      </div>
                      <Progress value={35} className={cn("h-3 rounded-full", votedOption === 'B' ? "bg-primary/10" : "bg-muted")} />
                    </div>
                    <p className="text-[10px] text-center text-primary font-bold uppercase tracking-widest mt-2">
                       {votedOption === 'A' ? 'İtiraf seçeneğine oy verdiniz!' : 'Sırrı saklama seçeneğine oy verdiniz!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
                   className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 animate-pulse-subtle"
                 >
                   <Coins className="w-5 h-5" />
                   15 Jeton ile Aç
                 </Button>
                 <Button 
                   variant="outline"
                   className="w-full h-12 rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Play className="w-4 h-4 fill-current" />
                   Reklam İzle ve Ücretsiz Aç
                 </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Aura Premium ile tüm bölümler açık</p>
           </div>
        </section>
      </article>

      <Sheet open={!!selectedLore} onOpenChange={(open) => !open && setSelectedLore(null)}>
        <SheetContent side="bottom" className="h-[480px] rounded-t-[3rem] p-0 border-none bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          {selectedLore && (
            <div className="h-full flex flex-col relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 pointer-events-none" />
              
              <div className="relative h-60 w-full">
                <Image 
                  src={selectedLore.imageUrl}
                  alt={selectedLore.name}
                  fill
                  className="object-cover"
                  data-ai-hint="character portrait"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full" />
              </div>

              <div className="px-8 py-6 flex flex-col items-center text-center gap-4 relative z-10">
                <div className="flex flex-col items-center">
                  <Badge className="bg-primary/20 text-primary border-none mb-2 text-[10px] font-bold uppercase tracking-tighter">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Karakter Bilgisi
                  </Badge>
                  <SheetTitle className="text-3xl font-headline font-black text-accent">{selectedLore.name}</SheetTitle>
                  <span className="text-primary font-bold text-sm tracking-wide">{selectedLore.role}</span>
                </div>
                
                <SheetDescription className="text-foreground/80 leading-relaxed italic text-base">
                  "{selectedLore.description}"
                </SheetDescription>

                <div className="flex gap-4 mt-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Görsel Hafıza</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Info className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Karakter Lore</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <footer className="h-24 bg-[#FDFBF7]" />
    </div>
  );
}
