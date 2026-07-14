
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
  Quote,
  MoreVertical,
  MoreHorizontal,
  Flag,
  UserX,
  AlertCircle,
  Eye
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserState, FORCE_FATE_COST } from '@/lib/user-state';
import { AdRewardModal } from '@/components/ad-reward-modal';
import { Input } from '@/components/ui/input';
import { useNetwork, fetchWithTimeout } from '@/hooks/use-network';
import { saveJournalEntry, type JournalEntry } from '@/lib/firebase';

const FlipBook = dynamic(() => import('@/components/FlipBook').then(m => ({ default: m.FlipBook })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

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
  { id: '1', user: 'Melis_92', text: 'Bu sahne kalbimi durdurdu! 😭', time: '2d' },
  { id: '2', user: 'KitapKurdu', text: 'Yazar burada ne demek istemiş acaba? Çok derin.', time: '5d' },
  { id: '3', user: 'StoryLover', text: 'Demir Ağa\'nın bakışlarını resmen hissettim.', time: '12d' },
];

type ReadingTheme = 'light' | 'sepia' | 'dark';
type LineSpacing = 'narrow' | 'normal' | 'wide';
type FontFamily = 'system' | 'bitter' | 'alef';
type ReadingMode = 'scroll' | 'swipe' | 'flip';

export function ReadingView({ story, onBack }: ReadingViewProps) {
  const { toast } = useToast();
  const { online } = useNetwork();
  const { userState, unlockWithVote, forceFateChoice, saveGeneratedChapter, getStoryEngine } = useUserState();
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLore, setSelectedLore] = useState<LoreInfo | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [celebrationGift, setCelebrationGift] = useState<string | null>(null);

  // ── AI Story Engine State ──────────────────────────────────
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [forceChoiceLabel, setForceChoiceLabel] = useState<string | null>(null);
  const engine = getStoryEngine(story.id);
  // All generated chapters from the story engine (persisted across re-renders)
  const generatedChapters = engine.generatedChapters;
  
  // Aura Vision State
  const [isAuraVisionOpen, setIsAuraVisionOpen] = useState(false);
  const [auraVisionImage, setAuraVisionImage] = useState('https://picsum.photos/seed/vision1/600/900');
  const [auraVisionQuote, setAuraVisionQuote] = useState('');

  // Parallax Header State
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const [headerScale, setHeaderScale] = useState(1);
  
  // UGC Safety State
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  
  // Quote Sharing State
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [editableQuote, setEditableQuote] = useState('');

  // Typography State
  const [fontSize, setFontSize] = useState([18]);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('dark');
  const [isDyslexic, setIsDyslexic] = useState(false);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('normal');
  const [fontFamily, setFontFamily] = useState<FontFamily>('system');
  const [readingMode, setReadingMode] = useState<ReadingMode>('scroll');
  const [pageView, setPageView] = useState<'single' | 'double'>('single');

  const paragraphs = [
    "Gece, İstanbul'un üzerine bir yorgan gibi serilmişti. Sokak lambalarının cılız ışığı, ıslak kaldırımlarda titrek yansımalar oluşturuyordu. Genç kadın, elindeki eski anahtarı titreyen parmaklarıyla kapı kilidine soktu. İçeriden gelen küf ve toz kokusu, yıllardır açılmamış bir sırrın habercisiydi.",
    "Adımını içeri attığında, zemindeki tahtaların gıcırtısı sessizliği bıçak gibi kesti. Kalbi göğüs kafesine sığmıyordu. Burası, dedesinin ona miras bıraktığı, ancak vasiyetinde 'asla açma' dediği o odaydı. Merak, korkudan her zaman daha ağır basardı.",
    "Masanın üzerindeki gaz lambasını yaktı. Işığın yayılmasıyla birlikte odanın köşelerinde saklanan gölgeler geri çekildi. Tam karşısında duran devasa yağlı boya tablo, sanki onu izliyordu. Tablodaki adamın gözleri, canlıymışçasına derin bir hüzün ve öfke barındırıyordu.",
    "Parmağını tablonun çerçevesinde gezdirdiğinde, eline sert bir çıkıntı çarptı. Bir düğme ya da bir kilit mekanizması olabilir miydi? Hafifçe bastırdığında, tablonun arkasındaki duvar yavaşça yana kaydı. Gizli bir bölme... Ve içinde deri ciltli, üzerinde gümüş bir mühür bulunan o defter.",
    "Mühürü kırmak için elini uzattığında, dışarıdan gelen ani bir fren sesiyle irkildi. Siyah bir lüks araç konağın önünde durmuştu. İçinden çıkan Demir Ağa, ağır adımlarla kapıya yöneldi. O an anladı ki, bu defter sadece bir anı değil, tehlikeli bir oyunun ilk parçasıydı.",
  ];

  // Flip modu için tüm paragrafları tek bir dizide topla
  const allParagraphs = useMemo(() => {
    const all: string[] = [...paragraphs];
    for (const ch of generatedChapters) {
      const chParas = ch.content.split('\n\n').filter(p => p.trim());
      all.push(...chParas);
    }
    return all;
  }, [generatedChapters]);

  // Immersive Mode — tap center to toggle UI visibility
  const [isUIVisible, setIsUIVisible] = useState(true);

  // Audio Player State
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioProgress, setAudioProgress] = useState(35);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // ── Cinematic Ambient Sound ──────────────────────────────
  const ambientOptions = [
    { id: 'none', label: 'Sessiz', emoji: '🔇' },
    { id: 'rain', label: 'Yağmur', emoji: '🌧️' },
    { id: 'fireplace', label: 'Şömine', emoji: '🔥' },
    { id: 'wind', label: 'Rüzgar', emoji: '🌬️' },
    { id: 'city', label: 'Şehir', emoji: '🌃' },
    { id: 'forest', label: 'Orman', emoji: '🌲' },
  ];
  const [ambientSound, setAmbientSound] = useState<string>('none');
  const [showAmbientPicker, setShowAmbientPicker] = useState(false);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ambientVolume, setAmbientVolume] = useState(0.3);

  // ── Reading Journal ──────────────────────────────────────
  const readingStartRef = useRef(Date.now());
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);
  const [journalEmotion, setJournalEmotion] = useState('');
  const [journalQuote, setJournalQuote] = useState('');

  const emotions = [
    { emoji: '😍', label: 'Aşık' }, { emoji: '😢', label: 'Hüzünlü' },
    { emoji: '🤯', label: 'Şaşkın' }, { emoji: '😱', label: 'Gerilim' },
    { emoji: '🤩', label: 'Heyecanlı' }, { emoji: '😌', label: 'Huzurlu' },
    { emoji: '😤', label: 'Öfkeli' }, { emoji: '🧐', label: 'Meraklı' },
  ];

  // Okuma süresi sayacı (dakika)
  useEffect(() => {
    readingStartRef.current = Date.now();
    const timer = setInterval(() => {
      setReadingMinutes(Math.floor((Date.now() - readingStartRef.current) / 60000));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Ambient ses değişince oynat
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
    }
    if (ambientSound === 'none') return;
    // Ambient ses URL'leri (ücretsiz, royalty-free)
    const sounds: Record<string, string> = {
      rain: 'https://assets.mixkit.co/active_storage/sfx/2514/2514.wav',
      fireplace: 'https://assets.mixkit.co/active_storage/sfx/2656/2656.wav',
      wind: 'https://assets.mixkit.co/active_storage/sfx/2505/2505.wav',
      city: 'https://assets.mixkit.co/active_storage/sfx/1141/1141.wav',
      forest: 'https://assets.mixkit.co/active_storage/sfx/2463/2463.wav',
    };
    const audio = new Audio(sounds[ambientSound] || '');
    audio.loop = true;
    audio.volume = ambientVolume;
    audio.play().catch(() => {});
    ambientAudioRef.current = audio;
    return () => { audio.pause(); };
  }, [ambientSound]);

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume;
    }
  }, [ambientVolume]);
  
  const lastScrollY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      const scrollY = target.scrollTop;
      
      // Top Bar Visibility
      if (scrollY > lastScrollY.current && scrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = scrollY;

      // Header Parallax/Fade
      if (scrollY < 300) {
        setHeaderOpacity(Math.max(0, 1 - scrollY / 250));
        setHeaderScale(1 + scrollY / 1000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleParaClick = (text: string) => {
    if (selectedQuote === text) {
      setSelectedQuote(null);
    } else {
      setSelectedQuote(text);
    }
  };

  const handleOpenTypography = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTypographyOpen(true);
  };

  const handleOpenShare = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditableQuote(selectedQuote || '');
    setIsShareSheetOpen(true);
  };

  const handleReportSubmit = () => {
    if (!reportReason) return;
    setIsReportSheetOpen(false);
    toast({
      title: "Rapor İletildi",
      description: "Şikayetiniz incelenmek üzere ekibimize iletilmiştir.",
      variant: "default",
    });
    setReportReason(null);
  };

  const handleBlockAuthor = () => {
    toast({
      title: "Yazar Engellendi",
      description: `${story.author} içeriği artık size gösterilmeyecek.`,
      variant: "destructive",
    });
  };

  const handleOpenAuraVision = (text: string) => {
    setAuraVisionQuote(text);
    setIsAuraVisionOpen(true);
  };

  const renderParagraph = (text: string, index: number) => {
    const hasComments = index === 1 || index === 4;
    const isSelected = selectedQuote === text;
    const isAuraVisionTrigger = index === 2; // Middle dramatic paragraph
    
    let content: React.ReactNode = text;

    if (text.includes('Demir Ağa')) {
      const parts = text.split('Demir Ağa');
      content = (
        <>
          {parts[0]}
          <span 
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedLore(LORE_DATA['Demir Ağa']); 
            }}
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
        onClick={(e) => {
          e.stopPropagation();
          handleParaClick(text);
        }}
      >
        <p
          style={{
            fontSize: `${fontSize[0]}px`,
            lineHeight: isDyslexic ? '2' : { narrow: '1.4', normal: '1.7', wide: '2.1' }[lineSpacing],
            letterSpacing: isDyslexic ? '0.05em' : 'normal',
            fontFamily: isDyslexic
              ? undefined
              : { system: undefined, bitter: '"Bitter", Georgia, "Times New Roman", serif', alef: '"Alef", "Segoe UI", Tahoma, sans-serif' }[fontFamily],
          }}
          className={cn(
            "text-lg leading-relaxed transition-all duration-500",
            !isDyslexic && fontFamily === 'system' && "font-serif",
            !isDyslexic && fontFamily === 'bitter' && "",
            !isDyslexic && fontFamily === 'alef' && "",
            isDyslexic && "font-body",
            readingTheme === 'light' && "text-foreground/90",
            readingTheme === 'sepia' && "text-[#5b4636]",
            readingTheme === 'dark' && "text-gray-300",
            index === 0 && !isAuraVisionTrigger && "first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left"
          )}
        >
          {content}
        </p>
        
        <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover/para:opacity-100 transition-opacity">
          {hasComments && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
              className="flex items-center gap-1 text-[10px] font-bold text-primary/60 hover:text-primary transition-all active:scale-90"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>24</span>
            </button>
          )}
          {isAuraVisionTrigger && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenAuraVision(text); }}
              className="flex items-center gap-1 text-primary animate-pulse"
            >
              <Sparkles className="w-5 h-5" />
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
          <div 
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-accent text-white px-3 py-1.5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 z-20"
            onClick={(e) => e.stopPropagation()} 
          >
            <button 
              onClick={handleOpenShare}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-1"
            >
              <Share2 className="w-3 h-3" />
              Paylaş
            </button>
            <div className="w-px h-3 bg-white/20 mx-1" />
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedQuote(null); 
              }}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
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

  // ── AI Story Generation ──────────────────────────────────
  const handleGenerateStory = async (option: 'A' | 'B', optionText: string, isForce: boolean) => {
    if (!online) {
      toast({ title: '⚠️ İnternet Bağlantısı Yok', description: 'Hikaye üretmek için internet bağlantısı gerekli.', variant: 'destructive' });
      return;
    }

    const chapterNum = engine.activeChapter + 1;
    setIsGeneratingStory(true);
    setForceChoiceLabel(isForce ? optionText : null);

    try {
      const res = await fetchWithTimeout('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: story.title,
          storyAuthor: story.author,
          storySynopsis: story.synopsis,
          storyTags: story.tags,
          previousChapters: engine.generatedChapters.map(gc => ({
            chapterNumber: gc.chapterNumber,
            title: gc.title,
            content: gc.content,
            chosenOption: gc.triggeredBy?.optionText,
          })),
          chosenFate: { option, text: optionText, isForceChoice: isForce },
          chapterNumber: chapterNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Hikaye üretilemedi');
      }

      const chapter = {
        chapterNumber: chapterNum,
        title: data.title,
        content: data.content,
        optionA: data.optionA,
        optionB: data.optionB,
        triggeredBy: { chapterNumber: chapterNum - 1, selectedOption: option as 'A' | 'B', optionText, isForceChoice: isForce },
        generatedAt: new Date().toISOString(),
      };

      saveGeneratedChapter(story.id, chapter);
      setVotedOption(null);

      // Okuma günlüğü prompt'u
      setJournalQuote('');
      setJournalEmotion('');
      setShowJournalPrompt(true);

      toast({
        title: `✨ ${data.title}`,
        description: 'Yeni bölüm hazır! Hikaye devam ediyor...',
      });
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Hikaye üretimi zaman aşımına uğradı. Lütfen tekrar deneyin.'
        : err.message || 'Hikaye üretilirken bir hata oluştu.';
      toast({
        title: err.name === 'AbortError' ? '⏱️ Zaman Aşımı' : '⚠️ Hata',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingStory(false);
      setForceChoiceLabel(null);
    }
  };

  const handleUnlockAndGenerate = () => {
    if (userState.credits < 15) {
      toast({ title: '⚠️ Yetersiz Kredi', description: 'Bu işlem için 15 jetona ihtiyacın var.', variant: 'destructive' });
      return;
    }
    unlockWithVote(story.id);
    // After unlock, auto-vote for the leading option
    handleGenerateStory('A', 'Topluluk oylamasıyla seçilen yol', false);
  };

  const handleForceFate = (option: 'A' | 'B', optionText: string) => {
    if (userState.credits < FORCE_FATE_COST) {
      toast({ title: '⚠️ Yetersiz Kredi', description: `Bu işlem için ${FORCE_FATE_COST} jetona ihtiyacın var.`, variant: 'destructive' });
      return;
    }
    forceFateChoice(story.id, engine.activeChapter, option, optionText);
    handleGenerateStory(option, optionText, true);
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
    { id: 'coffee', name: 'Kahve', icon: Coffee, cost: 50, color: 'text-purple-700 dark:text-purple-300 bg-amber-50 dark:bg-amber-900/20' },
    { id: 'crown', name: 'Taç', icon: Crown, cost: 500, color: 'text-brand-primary bg-yellow-50 dark:bg-yellow-900/20' },
    { id: 'heart', name: 'Kalp', icon: Heart, cost: 5, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
  ];

  const themeColors = {
    light: "bg-white dark:bg-brand-dark",
    sepia: "bg-[#f4ecd8]",
    dark: "bg-[#1a1a1a]"
  };

  const isHorizontal = readingMode === 'swipe';

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[200] animate-in fade-in duration-500 transition-colors duration-500",
        isHorizontal && "overflow-x-auto overflow-y-hidden snap-x snap-mandatory",
        readingMode === 'scroll' && "overflow-y-auto no-scrollbar",
        readingMode === 'flip' && "overflow-hidden flex flex-col",
        themeColors[readingTheme]
      )}
      onClick={(e) => {
        // Flip modunda sayfa çevirme ile çakışmaması için center-tap kapalı
        if (readingMode === 'flip') return;
        // Only toggle UI / clear quote when clicking on empty background
        const target = e.target as HTMLElement;
        if (target.closest('button, header, [role="button"], [role="menuitem"], [role="dialog"], a, input, textarea, select, [data-radix-popper-content-wrapper], [data-radix-collection-item]')) {
          return;
        }
        setSelectedQuote(null);
        setIsUIVisible(prev => !prev);
      }}
    >
      {/* Celebration Overlay */}
      {celebrationGift && (
        <div className="fixed inset-0 z-[1000] pointer-events-none flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
          <div className="relative animate-bounce">
             <div className="w-32 h-32 rounded-full bg-white dark:bg-card flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-primary/20">
               {celebrationGift === 'rose' && <Flower2 className="w-16 h-16 text-rose-500" />}
               {celebrationGift === 'coffee' && <Coffee className="w-16 h-16 text-purple-700 dark:text-purple-300" />}
               {celebrationGift === 'crown' && <Crown className="w-16 h-16 text-brand-primary" />}
               {celebrationGift === 'heart' && <Heart className="w-16 h-16 text-pink-500 fill-current" />}
             </div>
          </div>
          <h2 className="text-2xl font-headline font-black text-white drop-shadow-lg mt-6 relative z-10 text-center">Harika Bir Hediye!</h2>
        </div>
      )}

      {/* Aura Vision Lightbox */}
      <Dialog open={isAuraVisionOpen} onOpenChange={setIsAuraVisionOpen}>
        <DialogContent className="max-w-[90%] p-0 border-none bg-black/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl z-[700]">
          <DialogTitle className="sr-only">Aura Vision Sahnesi</DialogTitle>
          <div className="relative aspect-[2/3] w-full">
            <Image 
              src={auraVisionImage} 
              alt="Aura Vision Scene" 
              fill 
              className="object-cover"
              data-ai-hint="dramatic scene"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <button 
              onClick={() => setIsAuraVisionOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full glass-morphism flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 px-6 pt-6 pb-10 max-h-[160px] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">AURA VISION</span>
              </div>
              <p className="text-sm md:text-base font-serif italic text-zinc-200 leading-relaxed">
                "{auraVisionQuote}"
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md border-b px-6 flex items-center justify-between transition-all duration-300 max-w-md mx-auto",
          (!isVisible || !isUIVisible) ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
          readingTheme === 'dark' ? "bg-[#161823]/90 border-zinc-800" : "bg-white/80 border-black/10"
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className={cn(
            "p-2 -ml-2 rounded-full transition-colors active:scale-90",
            readingTheme === 'dark' ? "text-zinc-100 hover:bg-white/10" : "text-accent hover:bg-black/5"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center min-w-0 flex-1 mx-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bölüm 1</span>
          <h2 className={cn(
            "text-sm font-headline font-bold truncate max-w-[160px]",
            readingTheme === 'dark' ? "text-white" : "text-accent"
          )}>Teslimiyet</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleOpenTypography}
            className={cn(
              "p-2 rounded-full transition-colors active:scale-90",
              readingTheme === 'dark' ? "text-zinc-100 hover:bg-white/10" : "text-accent hover:bg-black/5"
            )}
          >
            <Type className="w-5 h-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                "p-2 rounded-full transition-colors active:scale-90 outline-none",
                readingTheme === 'dark' ? "text-zinc-100 hover:bg-white/10" : "text-accent hover:bg-black/5"
              )}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[180px] z-[600]">
              <DropdownMenuItem 
                onSelect={() => setIsReportSheetOpen(true)}
                className="flex items-center gap-2 text-destructive font-bold p-3 rounded-xl cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                İçeriği Şikayet Et
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={handleBlockAuthor}
                className="flex items-center gap-2 text-destructive font-bold p-3 rounded-xl cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                Yazarı Engelle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Cinematic Parallax Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.06] transition-opacity duration-1000"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary)) 0%, transparent 70%)',
          transform: `translateY(${-(headerOpacity || 0) * 40}px) scale(${1 + (headerOpacity || 0) * 0.1})`,
        }}
      />

      {/* ── 3D FlipBook Mode ────────────────────────────────── */}
      {readingMode === 'flip' && (
        <div className="flex-1 flex items-center justify-center w-full px-1 pt-16 pb-20 touch-auto">
          <FlipBook
            paragraphs={allParagraphs}
            fontSize={fontSize[0]}
            lineSpacing={lineSpacing}
            readingTheme={readingTheme}
            fontFamily={fontFamily}
            isDyslexic={isDyslexic}
            singlePage={pageView === 'single'}
            onPageChange={(page) => {
              // Sayfa değişimini takip et (ileride analytics/progress için)
            }}
          />
        </div>
      )}

      {/* ── Scroll / Swipe Article ─────────────────────────── */}
      {readingMode !== 'flip' && (
      <article
        className={cn(
          !isHorizontal && "pb-40 max-w-md mx-auto relative",
          isHorizontal && "flex flex-row h-[calc(100dvh-64px)]"
        )}
      >
        {/* Parallax Cinematic Header */}
        <div
          className={cn(
            "relative overflow-hidden w-full",
            !isHorizontal && "h-[250px]",
            isHorizontal && "min-w-[100dvw] w-[100dvw] h-full snap-center"
          )}
          style={{ opacity: headerOpacity }}
        >
          <div 
            className="absolute inset-0 w-full h-full transition-transform duration-100 ease-out"
            style={{ transform: `scale(${headerScale})` }}
          >
            <Image 
              src="https://picsum.photos/seed/header1/1200/800"
              alt="Chapter Header"
              fill
              className="object-cover"
              data-ai-hint="cinematic interior"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <h1 className="text-3xl sm:text-4xl font-headline font-black text-white text-center drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] leading-tight animate-in slide-in-from-top-4 duration-1000 px-4 break-words hyphens-auto">
              Bölüm 1: Teslimiyet
            </h1>
          </div>
        </div>

        <div className={cn(
          !isHorizontal && "px-8 mt-12 flex flex-col",
          isHorizontal && "flex flex-row h-full"
        )}>
          {/* ═══════════════════════════════════════════════ */}
          {/* BÖLÜM 1: Orijinal (hardcoded)                  */}
          {/* ═══════════════════════════════════════════════ */}
          <section className={cn(
            "mb-10",
            isHorizontal && "min-w-[100dvw] w-[100dvw] h-full overflow-y-auto snap-center px-5 pt-6"
          )}>
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
            {/* Bölüm 1 alt etiketi */}
            <div className="flex items-center gap-2 mt-3 mb-1">
              <Badge className="bg-muted/50 text-muted-foreground border-none text-[9px]">Bölüm 1</Badge>
              <button
                onClick={handleOpenShare}
                className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary font-bold transition-colors"
              >
                <Share2 className="w-3 h-3" /> Paylaş
              </button>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════ */}
          {/* AI-GENERATED CHAPTERS (history preserved)      */}
          {/* ═══════════════════════════════════════════════ */}
          {generatedChapters.map((chapter, chIdx) => {
            const isLatest = chIdx === generatedChapters.length - 1;
            return (
              <section
                key={`ch-${chapter.chapterNumber}`}
                className={cn(
                  "mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 w-full max-w-full overflow-hidden",
                  isHorizontal && "min-w-[100dvw] w-[100dvw] h-full overflow-y-auto snap-center px-5 pt-6"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Chapter Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold gap-1">
                    <Sparkles className="w-3 h-3" /> AI
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 border-none text-[10px] font-bold">
                    Bölüm {chapter.chapterNumber}
                  </Badge>
                  {chapter.triggeredBy && (
                    <span className="text-[9px] text-muted-foreground italic ml-1">
                      "{chapter.triggeredBy.optionText}"
                    </span>
                  )}
                </div>

                {/* Chapter Title */}
                <h2 className={cn(
                  "text-xl font-headline font-black mb-4 leading-tight break-words hyphens-auto",
                  readingTheme === 'dark' ? "text-white" : "text-accent"
                )}>
                  {chapter.title}
                </h2>

                {/* Chapter Content — rich paragraphs with interaction */}
                <div className="space-y-3">
                  {chapter.content.split('\n\n').filter(p => p.trim()).map((para, pIdx) => {
                    const isSelected = selectedQuote === para;
                    return (
                      <div
                        key={pIdx}
                        className={cn(
                          "relative group/para cursor-pointer transition-all duration-300 rounded-xl px-2 -mx-2",
                          isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuote(isSelected ? null : para);
                        }}
                      >
                        <p
                          style={{
                            fontSize: `${fontSize[0]}px`,
                            lineHeight: isDyslexic ? '2' : { narrow: '1.4', normal: '1.7', wide: '2.1' }[lineSpacing],
                            letterSpacing: isDyslexic ? '0.05em' : 'normal',
                            fontFamily: isDyslexic
                              ? undefined
                              : { system: undefined, bitter: '"Bitter", Georgia, "Times New Roman", serif', alef: '"Alef", "Segoe UI", Tahoma, sans-serif' }[fontFamily],
                          }}
                          className={cn(
                            "text-lg leading-relaxed transition-all duration-500",
                            !isDyslexic && fontFamily === 'system' && "font-serif",
                            !isDyslexic && fontFamily === 'bitter' && "",
                            !isDyslexic && fontFamily === 'alef' && "",
                            isDyslexic && "font-body",
                            readingTheme === 'light' && "text-foreground/90",
                            readingTheme === 'sepia' && "text-[#5b4636]",
                            readingTheme === 'dark' && "text-gray-300",
                            pIdx === 0 && "first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left"
                          )}
                        >
                          {para.trim()}
                        </p>

                        {/* Hover share button */}
                        <div className="absolute -right-10 top-0 opacity-0 group-hover/para:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedQuote(para); handleOpenShare(); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary/40 hover:text-primary transition-all active:scale-90"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selected quote toolbar */}
                        {isSelected && (
                          <div
                            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-accent text-white px-3 py-1.5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={handleOpenShare} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-1">
                              <Share2 className="w-3 h-3" /> Paylaş
                            </button>
                            <div className="w-px h-3 bg-white/20 mx-1" />
                            <button onClick={(e) => { e.stopPropagation(); setSelectedQuote(null); }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chapter footer: share + chapter badge */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-muted/50 text-muted-foreground border-none text-[9px]">
                    Bölüm {chapter.chapterNumber}
                  </Badge>
                  <button
                    onClick={handleOpenShare}
                    className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary font-bold transition-colors"
                  >
                    <Share2 className="w-3 h-3" /> Paylaş
                  </button>
                </div>

                {/* Fate panel — only on the LATEST chapter */}
                {isLatest && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Kaderini Belirle</span>
                    </div>

                    <div className="flex flex-col gap-3 p-6 rounded-[2rem] border-2 border-primary/20 dark:border-zinc-700 bg-white/60 dark:bg-[#161823]/80 backdrop-blur-sm shadow-lg w-full max-w-full overflow-hidden">
                      {isGeneratingStory ? (
                        <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
                          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300 text-center">✍️ Yapay Zeka Hikayeni Yazıyor...</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
                            {forceChoiceLabel ? `"${forceChoiceLabel}" yolunda ilerleniyor...` : 'Topluluk kararına göre hikaye şekilleniyor...'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Fate option A */}
                          <button onClick={() => handleGenerateStory('A', chapter.optionA, false)} disabled={isGeneratingStory}
                            className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-primary/30 dark:border-zinc-600 text-accent dark:text-zinc-200 font-bold hover:bg-primary/5 dark:hover:bg-white/5 hover:border-primary dark:hover:border-zinc-400 transition-all flex items-start gap-3 text-left bg-transparent disabled:opacity-50">
                            <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal">A — {chapter.optionA}</span>
                            <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-current" />15</span>
                          </button>
                          {/* Fate option B */}
                          <button onClick={() => handleGenerateStory('B', chapter.optionB, false)} disabled={isGeneratingStory}
                            className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-primary/30 dark:border-zinc-600 text-accent dark:text-zinc-200 font-bold hover:bg-primary/5 dark:hover:bg-white/5 hover:border-primary dark:hover:border-zinc-400 transition-all flex items-start gap-3 text-left bg-transparent disabled:opacity-50">
                            <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal">B — {chapter.optionB}</span>
                            <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-current" />15</span>
                          </button>
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">ya da</span>
                            <div className="flex-1 h-px bg-border/50" />
                          </div>
                          {/* Force fate A */}
                          <button onClick={() => handleForceFate('A', chapter.optionA)} disabled={isGeneratingStory}
                            className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-brand-primary/40 dark:border-purple-500/30 bg-brand-primary/5 dark:bg-[#0D0E12]/60 text-accent dark:text-zinc-100 font-bold hover:border-brand-primary dark:hover:border-purple-400 transition-all flex items-start gap-3 text-left disabled:opacity-50">
                            <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal flex items-center gap-1.5"><Crown className="w-4 h-4 text-brand-primary flex-shrink-0" />Kendi Kaderini Belirle — A</span>
                            <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-brand-primary" />{FORCE_FATE_COST}</span>
                          </button>
                          {/* Force fate B */}
                          <button onClick={() => handleForceFate('B', chapter.optionB)} disabled={isGeneratingStory}
                            className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-brand-primary/40 dark:border-purple-500/30 bg-brand-primary/5 dark:bg-[#0D0E12]/60 text-accent dark:text-zinc-100 font-bold hover:border-brand-primary dark:hover:border-purple-400 transition-all flex items-start gap-3 text-left disabled:opacity-50">
                            <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal flex items-center gap-1.5"><Crown className="w-4 h-4 text-brand-primary flex-shrink-0" />Kendi Kaderini Belirle — B</span>
                            <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-brand-primary" />{FORCE_FATE_COST}</span>
                          </button>

                          {/* ── Ad Reward Button ── */}
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 h-px bg-border/30" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsAdModalOpen(true); }}
                              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-brand-primary/10 dark:bg-purple-900/30 dark:from-purple-900/20 dark:to-purple-800/20 border border-brand-primary/30 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:scale-105 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                            >
                              <Gift className="w-4 h-4" />
                              🎁 Ücretsiz Jeton Kazan (Reklam İzle)
                            </button>
                            <div className="flex-1 h-px bg-border/30" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {/* ═══════════════════════════════════════════════ */}
          {/* FIRST-TIME PAYWALL (no generated chapters yet) */}
          {/* ═══════════════════════════════════════════════ */}
          {generatedChapters.length === 0 && (
            <>
              {/* Community Choice Card — only before first generation */}
              <section className={cn("mb-8 animate-in slide-in-from-bottom-5 duration-700 w-full max-w-full overflow-hidden", isHorizontal && "min-w-[100dvw] w-[100dvw] h-full overflow-y-auto snap-center px-5 pt-6")} onClick={(e) => e.stopPropagation()}>
                <div className={cn("relative p-6 rounded-[2.5rem] border-2 shadow-xl overflow-hidden group transition-all duration-500 w-full max-w-full",
                  readingTheme === 'dark' ? "bg-[#0D0E12]/90 border-zinc-800" : "bg-white border-primary/20")}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12"><Sparkles className="w-20 h-20 text-primary" /></div>
                  <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                        <Timer className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Kapanışa: 12S 45D</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-brand-primary font-bold text-[10px] uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" /><span>Kaderini Belirle</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className={cn("text-xl font-headline font-black leading-tight", readingTheme === 'dark' ? "text-white" : "text-accent")}>
                        Hikayenin Kaderini Belirle!
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium italic">"Sizce Defne gerçeği Demir'e itiraf etmeli mi?"</p>
                    </div>

                    {isGeneratingStory ? (
                      <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300 text-center">✍️ Yapay Zeka Hikayeni Yazıyor...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 w-full max-w-full">
                        <button onClick={() => handleGenerateStory('A', 'Gerçeği İtiraf Etsin', false)} disabled={isGeneratingStory}
                          className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-primary/30 dark:border-zinc-600 text-accent dark:text-zinc-200 font-bold hover:bg-primary/5 dark:hover:bg-white/5 hover:border-primary dark:hover:border-zinc-400 transition-all flex items-start gap-3 text-left bg-transparent disabled:opacity-50">
                          <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal">A — Gerçeği İtiraf Etsin</span>
                          <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-current" />15</span>
                        </button>
                        <button onClick={() => handleGenerateStory('B', 'Sırrını Saklasın', false)} disabled={isGeneratingStory}
                          className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-primary/30 dark:border-zinc-600 text-accent dark:text-zinc-200 font-bold hover:bg-primary/5 dark:hover:bg-white/5 hover:border-primary dark:hover:border-zinc-400 transition-all flex items-start gap-3 text-left bg-transparent disabled:opacity-50">
                          <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal">B — Sırrını Saklasın</span>
                          <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-current" />15</span>
                        </button>
                        <div className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-border/50" /><span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">ya da</span><div className="flex-1 h-px bg-border/50" /></div>
                        <button onClick={() => handleForceFate('A', 'Gerçeği İtiraf Etsin')} disabled={isGeneratingStory}
                          className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-brand-primary/40 dark:border-purple-500/30 bg-brand-primary/5 dark:bg-[#0D0E12]/60 text-accent dark:text-zinc-100 font-bold hover:border-brand-primary dark:hover:border-purple-400 transition-all flex items-start gap-3 text-left disabled:opacity-50">
                          <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal flex items-center gap-1.5"><Crown className="w-4 h-4 text-brand-primary flex-shrink-0" />Kendi Kaderini Belirle — A</span>
                          <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-brand-primary" />{FORCE_FATE_COST}</span>
                        </button>
                        <button onClick={() => handleForceFate('B', 'Sırrını Saklasın')} disabled={isGeneratingStory}
                          className="w-full max-w-full h-auto py-4 px-5 rounded-2xl border border-brand-primary/40 dark:border-purple-500/30 bg-brand-primary/5 dark:bg-[#0D0E12]/60 text-accent dark:text-zinc-100 font-bold hover:border-brand-primary dark:hover:border-purple-400 transition-all flex items-start gap-3 text-left disabled:opacity-50">
                          <span className="flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-normal flex items-center gap-1.5"><Crown className="w-4 h-4 text-brand-primary flex-shrink-0" />Kendi Kaderini Belirle — B</span>
                          <span className="flex items-center gap-1 text-brand-primary flex-shrink-0 pt-0.5"><Coins className="w-3.5 h-3.5 fill-brand-primary" />{FORCE_FATE_COST}</span>
                        </button>

                        {/* ── Ad Reward Button ── */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex-1 h-px bg-border/30" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsAdModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-brand-primary/10 dark:bg-purple-900/30 dark:from-purple-900/20 dark:to-purple-800/20 border border-brand-primary/30 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:scale-105 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                          >
                            <Gift className="w-4 h-4" />
                            🎁 Ücretsiz Jeton Kazan (Reklam İzle)
                          </button>
                          <div className="flex-1 h-px bg-border/30" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Paywall */}
              <section className={cn("mb-32 animate-in slide-in-from-bottom-10 duration-700 delay-300 w-full max-w-full overflow-hidden", isHorizontal && "min-w-[100dvw] w-[100dvw] h-full overflow-y-auto snap-center px-5 pt-6")} onClick={(e) => e.stopPropagation()}>
                <div className={cn("p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border flex flex-col items-center text-center gap-6 transition-all duration-500 w-full max-w-full",
                  readingTheme === 'dark' ? "bg-[#0D0E12]/90 border-zinc-800" : "bg-white border-primary/10")}>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {isGeneratingStory ? <Sparkles className="w-8 h-8 animate-pulse" /> : <Lock className="w-8 h-8" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className={cn("text-xl font-headline font-bold", readingTheme === 'dark' ? "text-white" : "text-accent")}>
                      {isGeneratingStory ? '✍️ Yapay Zeka Yazıyor...' : 'Bu bölüm kilitli'}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 px-4">
                      {isGeneratingStory ? 'Hikayenin devamı hazırlanıyor...' : 'Okumaya devam etmek için kilidi aç. AI bir sonraki bölümü senin için yazacak.'}
                    </p>
                  </div>
                  <Button onClick={handleUnlockAndGenerate} disabled={isGeneratingStory}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 animate-pulse-subtle disabled:opacity-50">
                    {isGeneratingStory ? <Sparkles className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
                    {isGeneratingStory ? 'Hikaye Üretiliyor...' : '15 Jeton ile Aç'}
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </article>
      )}

      {/* Floating Buttons Group */}
      <div
        className={cn(
          "fixed bottom-8 right-8 flex flex-col gap-4 z-[210] transition-all duration-300",
          isUIVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Ambient Sound Button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowAmbientPicker(!showAmbientPicker); }}
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group relative",
            ambientSound !== 'none'
              ? "bg-amber-500 text-white shadow-amber-500/40"
              : "bg-white/80 dark:bg-zinc-800 text-muted-foreground shadow-black/10"
          )}
        >
          <span className="text-xl">{ambientOptions.find(a => a.id === ambientSound)?.emoji || '🎵'}</span>
          <span className="absolute -left-20 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 text-accent dark:text-zinc-100 text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            {ambientSound === 'none' ? 'Ortam Sesi' : ambientOptions.find(a => a.id === ambientSound)?.label}
          </span>
        </button>

        {/* Ambient Picker Panel */}
        {showAmbientPicker && (
          <div className="absolute right-16 bottom-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border/20 dark:border-zinc-700 p-3 flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-200 z-[220]">
            {ambientOptions.map(opt => (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setAmbientSound(opt.id);
                  setShowAmbientPicker(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95",
                  ambientSound === opt.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span>{opt.label}</span>
                {ambientSound === opt.id && <span className="w-2 h-2 rounded-full bg-primary ml-auto" />}
              </button>
            ))}
            {/* Volume slider */}
            {ambientSound !== 'none' && (
              <div className="px-2 pt-2 mt-1 border-t border-border/20 dark:border-zinc-700">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-full h-1 accent-primary"
                />
              </div>
            )}
          </div>
        )}

        {!isAudioPlayerOpen && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsAudioPlayerOpen(true); }}
            className="w-14 h-14 rounded-full bg-accent text-white shadow-2xl shadow-accent/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all group relative"
          >
            <Headphones className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="absolute -left-16 top-1/2 -translate-y-1/2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Dinle
            </span>
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setIsGiftsOpen(true); }}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
        >
          <Gift className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Docked Audio Player */}
      {isAudioPlayerOpen && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[250] max-w-md mx-auto animate-in slide-in-from-bottom duration-500"
          onClick={(e) => e.stopPropagation()}
        >
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
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-1">
                <span>02:15</span>
                <span>14:30</span>
              </div>
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
          <div className="p-8 flex flex-col h-full gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            
            <SheetHeader className="flex flex-col items-center text-center">
              <SheetTitle className="text-xl font-headline font-black text-accent">Instagram Hikayesi Oluştur</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">Favori alıntını takipçilerinle paylaş!</SheetDescription>
            </SheetHeader>

            <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group mx-2 bg-black">
              <div className="absolute inset-0">
                <Image src={story.imageUrl} alt="preview" fill className="object-cover scale-110 blur-xl opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
              </div>

              <div className="relative h-full p-6 sm:p-8 flex flex-col text-white z-10">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex flex-col">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Aura Stories</h4>
                      <div className="w-8 h-1 bg-primary rounded-full" />
                   </div>
                   <Quote className="w-8 h-8 text-primary/40 rotate-12" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
                   {/* Düzenleme ipucu */}
                   <span className="text-[9px] text-white/30 font-medium tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     ✎ Düzenlemek için dokunun
                   </span>
                   <textarea
                     value={editableQuote}
                     onChange={(e) => setEditableQuote(e.target.value)}
                     maxLength={280}
                     rows={3}
                     className={cn(
                       "w-full bg-transparent border-none outline-none resize-none text-center font-serif font-bold italic leading-relaxed drop-shadow-md placeholder:text-white/30",
                       !editableQuote || editableQuote.length < 100
                         ? "text-2xl sm:text-3xl"
                         : editableQuote.length < 200
                           ? "text-lg sm:text-xl"
                           : "text-sm sm:text-base"
                     )}
                     placeholder="Alıntı metni buraya gelecek..."
                   />
                   <span className="text-[9px] text-white/20 font-mono">
                     {editableQuote.length}/280
                   </span>
                </div>

                <div className="mt-auto space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-white/20 shadow-lg shrink-0">
                      <Image src={story.imageUrl} alt="cover" fill className="object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-headline font-black tracking-tight truncate">{story.title}</span>
                      <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest truncate">{story.author}</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[9px] font-black uppercase tracking-tighter">
                       AuraStories.com
                    </div>
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

      {/* UGC Report Sheet */}
      <Sheet open={isReportSheetOpen} onOpenChange={(open) => {
        setIsReportSheetOpen(open);
        if (!open) setReportReason(null);
      }}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <SheetHeader className="flex flex-col items-center gap-1">
              <SheetTitle className="text-xl font-headline font-black text-accent">İçeriği Şikayet Et</SheetTitle>
              <SheetDescription className="text-center text-sm text-muted-foreground">
                Lütfen şikayet nedeninizi seçin. Aura Stories güvenli içerik politikasına önem verir.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="px-8 pb-8 flex flex-col gap-2">
            {["Yasa Dışı İçerik", "Aşırı Şiddet / Tehdit", "Telif Hakkı İhlali", "Spam", "Nefret Söylemi"].map((reason) => (
              <button
                key={reason}
                onClick={() => setReportReason(reason)}
                className={cn(
                  "w-full p-4 rounded-2xl text-sm font-bold transition-all text-left flex items-center justify-between",
                  reportReason === reason 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-muted/30 text-accent hover:bg-muted/50"
                )}
              >
                {reason}
                {reportReason === reason && <CheckCircle2 className="w-4 h-4" />}
              </button>
            ))}
            
            <Button 
              disabled={!reportReason}
              onClick={handleReportSubmit}
              className="mt-6 w-full h-14 rounded-2xl bg-destructive text-white font-bold shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Şikayeti Gönder
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lore Card Sheet */}
      <Sheet open={!!selectedLore} onOpenChange={(open) => !open && setSelectedLore(null)}>
        <SheetContent side="bottom" className="h-[480px] rounded-t-[3rem] p-0 border-none bg-background/95 backdrop-blur-xl overflow-hidden z-[600]">
          {selectedLore && (
            <div className="h-full flex flex-col relative">
              <div className="relative h-60 w-full">
                <Image src={selectedLore.imageUrl} alt={selectedLore.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full" />
              </div>
              <div className="px-8 py-6 flex flex-col items-center text-center gap-4 relative z-10">
                <SheetHeader className="flex flex-col items-center">
                  <Badge className="bg-primary/20 text-primary border-none mb-2 text-[10px] font-bold uppercase tracking-tighter w-fit">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Karakter Bilgisi
                  </Badge>
                  <SheetTitle className="text-3xl font-headline font-black text-accent">{selectedLore.name}</SheetTitle>
                  <SheetDescription className="text-primary font-bold text-sm tracking-wide">{selectedLore.role}</SheetDescription>
                </SheetHeader>
                <p className="text-foreground/80 leading-relaxed italic text-base">"{selectedLore.description}"</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Typography Panel Sheet */}
      <Sheet open={isTypographyOpen} onOpenChange={setIsTypographyOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600] max-h-[85vh] overflow-y-auto no-scrollbar">
          <div className="p-8 flex flex-col gap-8">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />

            <SheetHeader className="hidden">
              <SheetTitle>Okuma Ayarları</SheetTitle>
              <SheetDescription>Yazı boyutu ve tema tercihlerini değiştirin.</SheetDescription>
            </SheetHeader>

            {/* Font Size */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5">A- <span className="text-[8px] opacity-50">KÜÇÜK</span></span>
                <span className="text-primary font-black text-xs">{fontSize[0]}px</span>
                <span className="flex items-center gap-1.5">A+ <span className="text-[8px] opacity-50">BÜYÜK</span></span>
              </div>
              <Slider value={fontSize} onValueChange={setFontSize} min={14} max={26} step={1} className="py-2" />
            </div>

            {/* Line Spacing */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Satır Aralığı</span>
              <div className="flex items-center gap-2">
                {([
                  { id: 'narrow' as LineSpacing, label: 'Dar' },
                  { id: 'normal' as LineSpacing, label: 'Normal' },
                  { id: 'wide' as LineSpacing, label: 'Geniş' },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLineSpacing(opt.id)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95',
                      lineSpacing === opt.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Theme */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Okuma Teması</span>
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={() => setReadingTheme('light')}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center bg-white dark:bg-brand-dark shadow-sm hover:scale-110 active:scale-95",
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

            {/* Font Family */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Yazı Tipi</span>
              <div className="flex items-center gap-2">
                {([
                  { id: 'system' as FontFamily, label: 'System', preview: 'Aa' },
                  { id: 'bitter' as FontFamily, label: 'Bitter', preview: 'Aa' },
                  { id: 'alef' as FontFamily, label: 'Alef', preview: 'Aa' },
                ]).map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setFontFamily(font.id)}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-bold transition-all border-2 flex flex-col items-center gap-1 active:scale-95',
                      fontFamily === font.id
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                    )}
                  >
                    <span className={cn(
                      'text-lg',
                      font.id === 'bitter' && 'font-serif',
                      font.id === 'alef' && '',
                    )}>{font.preview}</span>
                    <span className="text-[10px]">{font.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dyslexia Mode */}
            <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[1.5rem] border border-border/40">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-accent">Disleksi Modu</span>
                <span className="text-[10px] text-muted-foreground font-medium">Özel okuma fontu ve aralaması</span>
              </div>
              <Switch checked={isDyslexic} onCheckedChange={setIsDyslexic} />
            </div>

            {/* Reading Mode */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Okuma Modu</span>
              <div className="flex items-center gap-2">
                {([
                  { id: 'scroll' as ReadingMode, label: 'Dikey', icon: '↕' },
                  { id: 'swipe' as ReadingMode, label: 'Yatay', icon: '↔' },
                  { id: 'flip' as ReadingMode, label: '3D Kitap', icon: '📖' },
                ]).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setReadingMode(mode.id)}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-bold transition-all border-2 flex flex-col items-center gap-1 active:scale-95',
                      readingMode === mode.id
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                    )}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <span className="text-[10px]">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page View — sadece 3D Kitap modunda görünür */}
            {readingMode === 'flip' && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">Görünüm</span>
                <div className="flex items-center gap-2">
                  {([
                    { id: 'single' as const, label: 'Tek Sayfa', icon: '📄' },
                    { id: 'double' as const, label: 'Çift Sayfa', icon: '📖' },
                  ]).map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setPageView(view.id)}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-bold transition-all border-2 flex flex-col items-center gap-1 active:scale-95',
                        pageView === view.id
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      <span className="text-lg">{view.icon}</span>
                      <span className="text-[10px]">{view.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Inline Comments Sheet */}
      <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <SheetContent side="bottom" className="h-[600px] rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col h-full relative">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />
            <SheetHeader className="flex items-center justify-between mb-8 flex-row space-y-0">
              <SheetTitle className="text-xl font-headline font-black text-accent">Satır Arası Yorumlar</SheetTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">24 Yorum</Badge>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-24">
              {DUMMY_COMMENTS.map((comment) => (
                <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group/comment">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{comment.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-accent">{comment.user}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{comment.time}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-full opacity-0 group-hover/comment:opacity-100 transition-opacity hover:bg-muted/50 text-muted-foreground">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[160px] z-[650]">
                            <DropdownMenuItem
                              onSelect={() => {
                                toast({ title: "Yorum Rapor Edildi", description: `"${comment.user}" kullanıcısının yorumu incelenmek üzere ekibimize iletildi.` });
                              }}
                              className="flex items-center gap-2 text-destructive font-bold p-3 rounded-xl cursor-pointer text-xs"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Yorumu Rapor Et
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                toast({ title: "Kullanıcı Engellendi", description: `"${comment.user}" kullanıcısının yorumları artık size gösterilmeyecek.`, variant: "destructive" });
                              }}
                              className="flex items-center gap-2 text-destructive font-bold p-3 rounded-xl cursor-pointer text-xs"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Kullanıcıyı Engelle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-2xl">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Input for Comments */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card via-card to-transparent pt-12">
              <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-[2rem] border border-border shadow-sm">
                <Input 
                  placeholder="Sen ne düşünüyorsun?..." 
                  className="border-none bg-transparent focus-visible:ring-0 text-sm h-12 rounded-full px-4"
                />
                <Button className="w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all p-0">
                   <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tipping / Gift Modal */}
      <Sheet open={isGiftsOpen} onOpenChange={setIsGiftsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="hidden">
              <SheetTitle>Hediye Gönder</SheetTitle>
              <SheetDescription>Yazara destek olmak için bir hediye seçin.</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4">
              {giftOptions.map((gift) => {
                const Icon = gift.icon;
                return (
                  <button key={gift.id} onClick={() => handleSendGift(gift.id)} className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-border/50 active:scale-95 transition-all hover:border-primary/40 hover:bg-primary/5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", gift.color)}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-accent">{gift.name}</span>
                    <div className="flex items-center gap-1 text-brand-primary font-black">
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

      {/* ── Ad Reward Modal ── */}
      {/* ── Reading Journal Sheet ── */}
      <Sheet open={showJournalPrompt} onOpenChange={setShowJournalPrompt}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-500 mb-2 text-3xl">📖</div>
              <SheetTitle className="text-xl font-headline font-black text-accent">Okuma Günlüğü</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Bu bölümü okurken neler hissettin? {readingMinutes > 0 && `(${readingMinutes} dk okudun)`}
              </SheetDescription>
            </SheetHeader>

            {/* Emotion picker */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hislerin</span>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map(e => (
                  <button
                    key={e.emoji}
                    onClick={() => setJournalEmotion(e.emoji)}
                    className={cn(
                      "p-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 border-2",
                      journalEmotion === e.emoji
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-2xl">{e.emoji}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quote input */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Favori Alıntın (isteğe bağlı)</span>
              <Input
                value={journalQuote}
                onChange={(e) => setJournalQuote(e.target.value)}
                placeholder="Bu bölümden aklında kalan bir cümle..."
                className="h-12 rounded-2xl border-border/50 dark:border-zinc-700 bg-muted/30 dark:bg-zinc-800 text-sm"
              />
            </div>

            {/* Save button */}
            <Button
              disabled={!journalEmotion}
              onClick={async () => {
                const uid = userState.user?.uid;
                const entry: JournalEntry = {
                  date: new Date().toISOString(),
                  storyId: story.id,
                  storyTitle: story.title,
                  chapterNumber: engine.activeChapter,
                  minutesRead: readingMinutes,
                  emotion: journalEmotion,
                  quote: journalQuote,
                };
                if (uid) {
                  await saveJournalEntry(uid, entry);
                } else {
                  // Misafir kullanıcı — localStorage
                  const existing = JSON.parse(localStorage.getItem('aura-journal') || '[]');
                  existing.unshift(entry);
                  localStorage.setItem('aura-journal', JSON.stringify(existing.slice(0, 50)));
                }
                setShowJournalPrompt(false);
                toast({ title: '📖 Günlüğe Kaydedildi!', description: 'Okuma anın ölümsüzleşti.' });
              }}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black shadow-lg disabled:opacity-40 active:scale-95 transition-all"
            >
              {journalEmotion ? 'Günlüğe Kaydet' : 'Bir his seç...'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AdRewardModal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />
    </div>
  );
}
