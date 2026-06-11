
'use client';

import { useState, useEffect, useRef } from 'react';
import { Story } from '@/lib/types';
import { 
  ArrowLeft, 
  Type, 
  Lock, 
  Coins, 
  Play, 
  Pause,
  Sparkles, 
  Timer, 
  CheckCircle2, 
  MessageSquare, 
  Gift, 
  Heart,
  Coffee,
  Crown,
  Flower2,
  Send,
  Headphones,
  SkipBack,
  SkipForward,
  X,
  Share2,
  Instagram,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

type ReadingTheme = 'light' | 'sepia' | 'dark';

export function ReadingView({ story, onBack }: ReadingViewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLore, setSelectedLore] = useState<LoreInfo | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [celebrationGift, setCelebrationGift] = useState<string | null>(null);
  
  // Quote Sharing State
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  // Typography State
  const [fontSize, setFontSize] = useState([18]);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('light');
  const [isDyslexic, setIsDyslexic] = useState(false);

  // Audio Player State
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioProgress, setAudioProgress] = useState(35);
  
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

  const handleParaClick = (text: string) => {
    setSelectedQuote(text);
  };

  const handleOpenTypography = () => {
    setIsTypographyOpen(true);
  };

  const handleOpenShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsShareSheetOpen(true);
  };

  const renderParagraph = (text: string, index: number) => {
    const hasComments = index === 1 || index === 4;
    const isSelected = selectedQuote === text;
    
    let content: React.ReactNode = text;

    if (text.includes('Demir Ağa')) {
      const parts = text.split('Demir Ağa');
      content = (
        <>
          {parts[0]}
          <span 
            onClick={(e) => { e.stopPropagation(); setSelectedLore(LORE_DATA['Demir Ağa']); }}
            className="text-primary font-bold underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-accent transition-colors"
          >
            Demir Ağa
          </span>
          {parts[1]}
        </>
      );
    }

    return (
      <div 
        key={index} 
        className={cn(
          "relative group/para mb-6 cursor-pointer transition-all duration-300 rounded-xl px-2 -mx-2",
          isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
        )}
        onClick={() => handleParaClick(text)}
      >
        <p 
          style={{ 
            fontSize: `${fontSize[0]}px`,
            lineHeight: isDyslexic ? '2' : '1.6',
            letterSpacing: isDyslexic ? '0.05em' : 'normal'
          }}
          className={cn(
            "text-lg leading-relaxed transition-all duration-500",
            isDyslexic ? "font-body" : "font-serif",
            readingTheme === 'light' && "text-foreground/90",
            readingTheme === 'sepia' && "text-[#5b4636]",
            readingTheme === 'dark' && "text-gray-300",
            index === 0 && "first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left"
          )}
        >
          {content}
        </p>
        
        <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover/para:opacity-100 transition-opacity">
          {hasComments && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
              className="flex items-center gap-1 text-[10px] font-bold text-primary/40 hover:text-primary transition-all active:scale-90"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>128</span>
            </button>
          )}
          <button 
            onClick={handleOpenShare}
            className="flex items-center gap-1 text-[10px] font-bold text-primary/40 hover:text-primary transition-all active:scale-90"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {isSelected && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-accent text-white px-3 py-1.5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 z-20">
            <button 
              onClick={handleOpenShare}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Share2 className="w-3 h-3" />
              Paylaş
            </button>
            <div className="w-px h-3 bg-white/20 mx-1" />
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedQuote(null); }}
              className="p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleVote = (option: string) => {
    setVotedOption(option);
  };

  const handleSendGift = (giftType: string) => {
    setCelebrationGift(giftType);
    setTimeout(() => {
      setCelebrationGift(null);
      setIsGiftsOpen(false);
    }, 2000);
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const giftOptions = [
    { id: 'rose', name: 'Gül', icon: Flower2, cost: 10, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { id: 'coffee', name: 'Kahve', icon: Coffee, cost: 50, color: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20' },
    { id: 'crown', name: 'Taç', icon: Crown, cost: 500, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
    { id: 'heart', name: 'Kalp', icon: Heart, cost: 5, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
  ];

  const themeColors = {
    light: "bg-white",
    sepia: "bg-[#f4ecd8]",
    dark: "bg-[#1a1a1a]"
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[200] overflow-y-auto no-scrollbar animate-in fade-in duration-500 transition-colors duration-500",
      themeColors[readingTheme]
    )}>
      {/* Celebration Overlay */}
      {celebrationGift && (
        <div className="fixed inset-0 z-[1000] pointer-events-none flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
          <div className="relative animate-bounce">
             <div className="w-32 h-32 rounded-full bg-white dark:bg-card flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-primary/20">
               {celebrationGift === 'rose' && <Flower2 className="w-16 h-16 text-rose-500" />}
               {celebrationGift === 'coffee' && <Coffee className="w-16 h-16 text-amber-700" />}
               {celebrationGift === 'crown' && <Crown className="w-16 h-16 text-yellow-600" />}
               {celebrationGift === 'heart' && <Heart className="w-16 h-16 text-pink-500 fill-current" />}
             </div>
          </div>
          <h2 className="text-2xl font-headline font-black text-white drop-shadow-lg mt-6 relative z-10 text-center">Harika Bir Hediye!</h2>
        </div>
      )}

      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md border-b border-border/20 px-6 flex items-center justify-between transition-transform duration-300 max-w-md mx-auto",
          !isVisible ? "-translate-y-full" : "translate-y-0",
          readingTheme === 'dark' ? "bg-black/80 border-white/10" : "bg-white/80 border-black/10"
        )}
      >
        <button 
          onClick={onBack}
          className={cn(
            "p-2 -ml-2 rounded-full transition-colors active:scale-90",
            readingTheme === 'dark' ? "text-white hover:bg-white/10" : "text-accent hover:bg-black/5"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bölüm 1</span>
          <h2 className={cn(
            "text-sm font-headline font-bold truncate max-w-[200px]",
            readingTheme === 'dark' ? "text-white" : "text-accent"
          )}>Teslimiyet</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleOpenTypography}
            className={cn(
              "p-2 -mr-2 rounded-full transition-colors active:scale-90",
              readingTheme === 'dark' ? "text-white hover:bg-white/10" : "text-accent hover:bg-black/5"
            )}
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
      </header>

      <article className="pt-24 px-8 pb-40 max-w-md mx-auto">
        <h1 className={cn(
          "text-3xl font-headline font-black mb-8 leading-tight transition-colors duration-500",
          readingTheme === 'sepia' ? "text-[#4a3a2a]" : (readingTheme === 'dark' ? "text-white" : "text-accent")
        )}>
          Bölüm 1: Teslimiyet
        </h1>

        <div className="relative">
          {paragraphs.slice(0, 4).map((p, i) => renderParagraph(p, i))}

          <div className="relative h-24 overflow-hidden pointer-events-none">
             {renderParagraph(paragraphs[4], 4)}
             <div className={cn(
               "absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-colors duration-500",
               readingTheme === 'light' && "from-white",
               readingTheme === 'sepia' && "from-[#f4ecd8]",
               readingTheme === 'dark' && "from-[#1a1a1a]"
             )} />
          </div>
        </div>

        {/* Community Choice (Sen Seç) Card */}
        <section className="mt-12 mb-8 animate-in slide-in-from-bottom-5 duration-700">
          <div className={cn(
            "relative p-6 rounded-[2.5rem] border-2 shadow-xl overflow-hidden group transition-all duration-500",
            readingTheme === 'dark' ? "bg-card border-primary/40" : "bg-white border-primary/20"
          )}>
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
                <h3 className={cn(
                  "text-xl font-headline font-black leading-tight",
                  readingTheme === 'dark' ? "text-white" : "text-accent"
                )}>
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Paywall Card */}
        <section className="mt-8 mb-32 animate-in slide-in-from-bottom-10 duration-700 delay-300">
           <div className={cn(
             "p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border flex flex-col items-center text-center gap-6 transition-all duration-500",
             readingTheme === 'dark' ? "bg-card border-white/5" : "bg-white border-primary/10"
           )}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                 <Lock className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                 <h3 className={cn(
                   "text-xl font-headline font-bold",
                   readingTheme === 'dark' ? "text-white" : "text-accent"
                 )}>Bu bölüm kilitli</h3>
                 <p className="text-sm text-muted-foreground px-4">Okumaya devam etmek için kilidi açın.</p>
              </div>

              <div className="flex flex-col w-full gap-3">
                 <Button 
                   className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 animate-pulse-subtle"
                 >
                   <Coins className="w-5 h-5" />
                   15 Jeton ile Aç
                 </Button>
              </div>
           </div>
        </section>
      </article>

      {/* Floating Buttons Group */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-[210]">
        {!isAudioPlayerOpen && (
          <button 
            onClick={() => setIsAudioPlayerOpen(true)}
            className="w-14 h-14 rounded-full bg-accent text-white shadow-2xl shadow-accent/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
          >
            <Headphones className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </button>
        )}
        
        <button 
          onClick={() => setIsGiftsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
        >
          <Gift className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Docked Audio Player */}
      {isAudioPlayerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[250] max-w-md mx-auto animate-in slide-in-from-bottom duration-500">
          <div className="mx-6 mb-6 p-4 rounded-[2rem] glass-morphism border border-white/20 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden relative shadow-md">
                   <Image src={story.imageUrl} alt="cover" fill className="object-cover" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Sesli Okuma</span>
                   <span className="text-xs font-bold text-accent truncate max-w-[120px]">{story.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleSpeed}
                  className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                >
                  {playbackSpeed}x
                </button>
                <button 
                  onClick={() => setIsAudioPlayerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Progress value={audioProgress} className="h-1.5 bg-primary/10" />
            </div>

            <div className="flex items-center justify-center gap-8">
               <button className="text-accent hover:text-primary transition-colors active:scale-90">
                 <SkipBack className="w-5 h-5 fill-current" />
               </button>
               <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
               >
                 {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
               </button>
               <button className="text-accent hover:text-primary transition-colors active:scale-90">
                 <SkipForward className="w-5 h-5 fill-current" />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Share Sheet */}
      <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
        <SheetContent side="bottom" className="h-[650px] rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <SheetHeader className="sr-only">
            <SheetTitle>Alıntı Paylaş</SheetTitle>
            <SheetDescription>Instagram Hikayesi Oluştur</SheetDescription>
          </SheetHeader>
          <div className="p-8 flex flex-col h-full gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-headline font-black text-accent">Instagram Hikayesi Oluştur</h3>
              <p className="text-xs text-muted-foreground">Favori alıntını takipçilerinle paylaş!</p>
            </div>

            {/* IG Story Preview Card */}
            <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group mx-2">
              <div className="absolute inset-0">
                <Image src={story.imageUrl} alt="preview" fill className="object-cover scale-110 blur-xl opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
              </div>

              <div className="relative h-full p-10 flex flex-col justify-between text-white z-10">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Aura Stories</h4>
                      <div className="w-8 h-1 bg-primary rounded-full" />
                   </div>
                   <Quote className="w-8 h-8 text-primary/40 rotate-12" />
                </div>

                <div className="flex flex-col gap-6">
                  <p className="text-2xl font-serif font-bold italic leading-relaxed drop-shadow-md">
                    "{selectedQuote || 'Alıntı metni buraya gelecek...'}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-white/20 shadow-lg">
                      <Image src={story.imageUrl} alt="cover" fill className="object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-headline font-black tracking-tight">{story.title}</span>
                      <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{story.author}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[9px] font-black uppercase tracking-tighter">
                     AuraStories.com
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-black shadow-xl shadow-pink-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform">
                <Instagram className="w-6 h-6" />
                Instagram Hikayesi Olarak Paylaş
              </Button>
              <Button variant="ghost" onClick={() => setIsShareSheetOpen(false)} className="text-muted-foreground font-bold">
                Vazgeç
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lore Card Sheet */}
      <Sheet open={!!selectedLore} onOpenChange={(open) => !open && setSelectedLore(null)}>
        <SheetContent side="bottom" className="h-[480px] rounded-t-[3rem] p-0 border-none bg-background/95 backdrop-blur-xl overflow-hidden z-[600]">
          <SheetHeader className="sr-only">
            <SheetTitle>Karakter Bilgisi</SheetTitle>
            <SheetDescription>Lore Card</SheetDescription>
          </SheetHeader>
          {selectedLore && (
            <div className="h-full flex flex-col relative">
              <div className="relative h-60 w-full">
                <Image src={selectedLore.imageUrl} alt={selectedLore.name} fill className="object-cover" />
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
                <p className="text-foreground/80 leading-relaxed italic text-base">"{selectedLore.description}"</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Typography Panel Sheet */}
      <Sheet open={isTypographyOpen} onOpenChange={setIsTypographyOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <SheetHeader className="sr-only">
            <SheetTitle>Metin Ayarları</SheetTitle>
            <SheetDescription>Font ve Tema</SheetDescription>
          </SheetHeader>
          <div className="p-8 flex flex-col gap-8">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            
            {/* Font Size Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5">A- <span className="text-[8px] opacity-50">KÜÇÜK</span></span>
                <span className="text-primary font-black text-xs">{fontSize[0]}px</span>
                <span className="flex items-center gap-1.5">A+ <span className="text-[8px] opacity-50">BÜYÜK</span></span>
              </div>
              <Slider value={fontSize} onValueChange={setFontSize} min={14} max={26} step={1} className="py-2" />
            </div>

            {/* Reading Themes */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Okuma Teması</span>
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={() => setReadingTheme('light')} 
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center bg-white shadow-sm hover:scale-110 active:scale-95",
                    readingTheme === 'light' ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                />
                <button 
                  onClick={() => setReadingTheme('sepia')} 
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center bg-[#f4ecd8] shadow-sm hover:scale-110 active:scale-95",
                    readingTheme === 'sepia' ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                />
                <button 
                  onClick={() => setReadingTheme('dark')} 
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center bg-[#1a1a1a] shadow-sm hover:scale-110 active:scale-95",
                    readingTheme === 'dark' ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                />
              </div>
            </div>

            {/* Dyslexia Mode Toggle */}
            <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[1.5rem] border border-border/40">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-accent">Disleksi Modu</span>
                <span className="text-[10px] text-muted-foreground font-medium">Özel okuma fontu ve aralaması</span>
              </div>
              <Switch checked={isDyslexic} onCheckedChange={setIsDyslexic} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Inline Comments Sheet */}
      <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <SheetContent side="bottom" className="h-[500px] rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <SheetHeader className="sr-only">
            <SheetTitle>Yorumlar</SheetTitle>
            <SheetDescription>Topluluk Tepkileri</SheetDescription>
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
                      <span className="text-[10px] text-muted-foreground">{comment.time}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-2xl">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tipping / Gift Modal */}
      <Sheet open={isGiftsOpen} onOpenChange={setIsGiftsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <SheetHeader className="sr-only">
            <SheetTitle>Hediye Gönder</SheetTitle>
            <SheetDescription>Yazarı Destekle</SheetDescription>
          </SheetHeader>
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <div className="grid grid-cols-2 gap-4">
              {giftOptions.map((gift) => {
                const Icon = gift.icon;
                return (
                  <button key={gift.id} onClick={() => handleSendGift(gift.id)} className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-border/50 active:scale-95 transition-all hover:border-primary/40 hover:bg-primary/5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", gift.color)}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-accent">{gift.name}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-black">
                      <Coins className="w-3 h-3 fill-current" />
                      <span className="text-xs">{gift.cost}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <footer className="h-24" />
    </div>
  );
}
