'use client';

import { useState, useEffect, useRef } from 'react';
import { Story } from '@/lib/types';
import { 
  ArrowLeft, 
  Type, 
  Lock, 
  Coins, 
  Play, 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  MessageSquare, 
  Gift, 
  Heart,
  Coffee,
  Crown,
  Flower2,
  Send
} from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

const DUMMY_COMMENTS = [
  { id: '1', user: 'Melis_92', text: 'İnanmıyorum! Defne bunu nasıl yapar?', time: '2d' },
  { id: '2', user: 'KitapKurdu', text: 'Demir Ağa çok gizemli birine benziyor.', time: '5d' },
  { id: '3', user: 'StoryLover', text: 'Bu oda kesinlikle bir şeyler saklıyor.', time: '12d' },
];

export function ReadingView({ story, onBack }: ReadingViewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLore, setSelectedLore] = useState<LoreInfo | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [celebrationGift, setCelebrationGift] = useState<string | null>(null);
  
  // Use ref to track scroll position to avoid effect re-runs on every scroll
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const paragraphs = [
    "Gece, İstanbul'un üzerine bir yorgan gibi serilmişti. Sokak lambalarının cılız ışığı, ıslak kaldırımlarda titrek yansımalar oluşturuyordu. Genç kadın, elindeki eski anahtarı titreyen parmaklarıyla kapı kilidine soktu. İçeriden gelen küf ve toz kokusu, yıllardır açılmamış bir sırrın habercisiydi.",
    "Adımını içeri attığında, zemindeki tahtaların gıcırtısı sessizliği bıçak gibi kesti. Kalbi göğüs kafesine sığmıyordu. Burası, dedesinin ona miras bıraktığı, ancak vasiyetinde 'asla açma' dediği o odaydı. Merak, korkudan her zaman daha ağır basardı.",
    "Masanın üzerindeki gaz lambasını yaktı. Işığın yayılmasıyla birlikte odanın köşelerinde saklanan gölgeler geri çekildi. Tam karşısında duran devasa yağlı boya tablo, sanki onu izliyordu. Tablodaki adamın gözleri, canlıymışçasına derin bir hüzün ve öfke barındırıyordu.",
    "Parmağını tablonun çerçevesinde gezdirdiğinde, eline sert bir çıkıntı çarptı. Bir düğme ya da bir kilit mekanizması olabilir miydi? Hafifçe bastırdığında, tablonun arkasındaki duvar yavaşça yana kaydı. Gizli bir bölme... Ve içinde deri ciltli, üzerinde gümüş bir mühür bulunan o defter.",
    "Mühürü kırmak için elini uzattığında, dışarıdan gelen ani bir fren sesiyle irkildi. Siyah bir lüks araç konağın önünde durmuştu. İçinden çıkan Demir Ağa, ağır adımlarla kapıya yöneldi. O an anladı ki, bu defter sadece bir anı değil, tehlikeli bir oyunun ilk parçasıydı.",
  ];

  const renderParagraph = (text: string, index: number) => {
    const hasComments = index === 1 || index === 4;
    
    let content: React.ReactNode = text;

    if (text.includes('Demir Ağa')) {
      const parts = text.split('Demir Ağa');
      content = (
        <>
          {parts[0]}
          <span 
            onClick={() => setSelectedLore(LORE_DATA['Demir Ağa'])}
            className="text-primary font-bold underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-accent transition-colors"
          >
            Demir Ağa
          </span>
          {parts[1]}
        </>
      );
    }

    return (
      <div key={index} className="relative group/para mb-6">
        <p className={cn(
          "font-serif text-lg leading-relaxed text-foreground/90",
          index === 0 && "first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left"
        )}>
          {content}
        </p>
        
        {hasComments && (
          <button 
            onClick={() => setIsCommentsOpen(true)}
            className="absolute -right-6 top-0 flex items-center gap-1 text-[10px] font-bold text-primary/40 hover:text-primary transition-all active:scale-90"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>128</span>
          </button>
        )}
      </div>
    );
  };

  const handleVote = (option: string) => {
    setVotedOption(option);
  };

  const handleSendGift = (giftType: string) => {
    setCelebrationGift(giftType);
    // Auto-close overlay after animation
    setTimeout(() => {
      setCelebrationGift(null);
      setIsGiftsOpen(false);
    }, 2000);
  };

  const giftOptions = [
    { id: 'rose', name: 'Gül', icon: Flower2, cost: 10, color: 'text-rose-500 bg-rose-50' },
    { id: 'coffee', name: 'Kahve', icon: Coffee, cost: 50, color: 'text-amber-700 bg-amber-50' },
    { id: 'crown', name: 'Taç', icon: Crown, cost: 500, color: 'text-yellow-600 bg-yellow-50' },
    { id: 'heart', name: 'Kalp', icon: Heart, cost: 5, color: 'text-pink-500 bg-pink-50' },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#FDFBF7] overflow-y-auto no-scrollbar animate-in fade-in duration-500">
      {/* Celebration Overlay - High z-index for visibility */}
      {celebrationGift && (
        <div className="fixed inset-0 z-[1000] pointer-events-none flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
          <div className="relative animate-bounce">
             <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-primary/20">
               {celebrationGift === 'rose' && <Flower2 className="w-16 h-16 text-rose-500" />}
               {celebrationGift === 'coffee' && <Coffee className="w-16 h-16 text-amber-700" />}
               {celebrationGift === 'crown' && <Crown className="w-16 h-16 text-yellow-600" />}
               {celebrationGift === 'heart' && <Heart className="w-16 h-16 text-pink-500 fill-current" />}
             </div>
             <div className="absolute -top-4 -right-4">
                <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />
             </div>
          </div>
          <h2 className="text-2xl font-headline font-black text-white drop-shadow-lg mt-6 relative z-10">Harika Bir Hediye!</h2>
        </div>
      )}

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

        <div className="relative">
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

        {/* Paywall Card */}
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

      {/* Floating Gift Button */}
      <button 
        onClick={() => setIsGiftsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-[210] group"
      >
        <Gift className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Lore Card Sheet */}
      <Sheet open={!!selectedLore} onOpenChange={(open) => !open && setSelectedLore(null)}>
        <SheetContent side="bottom" className="h-[480px] rounded-t-[3rem] p-0 border-none bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedLore?.name || 'Karakter Bilgisi'}</SheetTitle>
            <SheetDescription>{selectedLore?.role || 'Detaylar'}</SheetDescription>
          </SheetHeader>
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
                  <h3 className="text-3xl font-headline font-black text-accent">{selectedLore.name}</h3>
                  <span className="text-primary font-bold text-sm tracking-wide">{selectedLore.role}</span>
                </div>
                
                <p className="text-foreground/80 leading-relaxed italic text-base">
                  "{selectedLore.description}"
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Inline Comments Sheet */}
      <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <SheetContent side="bottom" className="h-[500px] rounded-t-[3rem] bg-white p-0 border-none animate-in slide-in-from-bottom duration-500">
          <SheetHeader className="sr-only">
            <SheetTitle>Satır İçi Yorumlar</SheetTitle>
            <SheetDescription>Topluluk tepkileri</SheetDescription>
          </SheetHeader>
          <div className="p-8 flex flex-col h-full">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-headline font-black text-accent">Satır İçi Yorumlar</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">128 Yorum</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {DUMMY_COMMENTS.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{comment.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-accent">{comment.user}</span>
                      <span className="text-[10px] text-muted-foreground">{comment.time} önce</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-2xl rounded-tl-none">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 bg-muted/30 p-2 rounded-2xl">
              <input 
                placeholder="Düşüncelerini paylaş..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3"
              />
              <button className="p-2 bg-primary text-white rounded-xl active:scale-90 transition-transform">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tipping / Gift Modal */}
      <Sheet open={isGiftsOpen} onOpenChange={setIsGiftsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-white p-0 border-none animate-in slide-in-from-bottom duration-500 z-[500]">
          <SheetHeader className="sr-only">
            <SheetTitle>Yazara Destek Ol</SheetTitle>
            <SheetDescription>Küçük bir hediye gönder</SheetDescription>
          </SheetHeader>
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-2xl font-headline font-black text-accent">Yazara Destek Ol</h3>
              <p className="text-sm text-muted-foreground">Bu hikayeyi sevdiysen yazara küçük bir hediye gönder!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {giftOptions.map((gift) => {
                const Icon = gift.icon;
                return (
                  <button 
                    key={gift.id}
                    onClick={() => handleSendGift(gift.id)}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group active:scale-95"
                  >
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", gift.color)}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-accent">{gift.name}</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Coins className="w-3 h-3 fill-current" />
                        <span className="text-xs font-black">{gift.cost}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Bakiyen</span>
                  <span className="text-sm font-black text-accent">1,250 Jeton</span>
                </div>
              </div>
              <Button variant="link" className="text-primary font-bold h-auto p-0">Yükle</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <footer className="h-24 bg-[#FDFBF7]" />
    </div>
  );
}