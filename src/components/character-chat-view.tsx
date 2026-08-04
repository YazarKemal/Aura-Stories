'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Story, CharacterRoster } from '@/lib/types';
import {
  ArrowLeft, Send, MoreHorizontal, ShieldCheck, Sparkles, Coins,
  AlertCircle, Loader2, Brain, Flag, CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUserState } from '@/lib/user-state';
import { useToast } from '@/hooks/use-toast';
import { loadChatHistory, saveChatMessage, submitContentReport, type ChatMessage } from '@/lib/firebase';
import { useNetwork } from '@/hooks/use-network';
import { sendChatMessage } from '@/lib/chat-client';
import { AdRewardModal } from '@/components/ad-reward-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CharacterChatViewProps {
  story: Story;
  activeCharacter: CharacterRoster;
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'character' | 'user' | 'system';
  timestamp: Date;
}

const REPORT_REASONS = [
  "Yasa Dışı İçerik",
  "Aşırı Şiddet / Tehdit",
  "Telif Hakkı İhlali",
  "Spam",
  "Nefret Söylemi",
  "Rahatsız Edici İçerik",
];

export function CharacterChatView({ story, activeCharacter, onBack }: CharacterChatViewProps) {
  const char = activeCharacter;
  const { spendCredits, addCredits, userState } = useUserState();
  const { toast } = useToast();
  const { online } = useNetwork();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: `greeting-${char.id}`,
      text: char.greeting,
      sender: 'character',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const sendLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Report state ──────────────────────────────────────────
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [reportTargetMsg, setReportTargetMsg] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  // Çift iadeyi önlemek için refund yapılmış AI çağrılarını takip et
  const refundedRef = useRef<Set<string>>(new Set());

  // ── Mobile keyboard handling ──────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const adjustForKeyboard = () => {
      if (!containerRef.current) return;
      const keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        containerRef.current.style.paddingBottom = `${keyboardHeight}px`;
      } else {
        containerRef.current.style.paddingBottom = '0px';
      }
    };
    vv.addEventListener('resize', adjustForKeyboard);
    vv.addEventListener('scroll', adjustForKeyboard);
    return () => {
      vv.removeEventListener('resize', adjustForKeyboard);
      vv.removeEventListener('scroll', adjustForKeyboard);
    };
  }, []);

  // Reset messages when character switches
  useEffect(() => {
    setMessages([
      { id: `greeting-${char.id}`, text: char.greeting, sender: 'character', timestamp: new Date() },
    ]);
    setError(null);
    setInputText('');
  }, [char.id, char.greeting]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Firestore'dan sohbet geçmişini yükle
  useEffect(() => {
    const uid = userState.user?.uid;
    if (!uid) return;
    let cancelled = false;
    loadChatHistory(uid, story.id, char.id).then(history => {
      if (!cancelled && history.length > 0) {
        setMessages(history.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    });
    return () => { cancelled = true; };
  }, [userState.user?.uid, story.id, char.id]);

  const sendToAPI = useCallback(
    async (history: Message[], operationId: string): Promise<{ text: string; memoryUpdates?: { newFactsLearned: { fact: string; importance: string }[]; hiddenSecretsRemaining: number } }> => {
      const conversationMessages = history
        .filter((m): m is Message & { sender: 'user' | 'character' } => m.sender === 'user' || m.sender === 'character')
        .map(m => ({ text: m.text, sender: m.sender }));
      const result = await sendChatMessage({
        storyId: story.id, storyTitle: story.title, storySynopsis: story.synopsis,
        storyLongSynopsis: story.longSynopsis, storyTags: story.tags,
        storyAuthor: story.author, characterName: char.name,
        messages: conversationMessages,
        operationId,
      });
      return { text: result.text, memoryUpdates: result.memoryUpdates };
    },
    [story, char.name]
  );

  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (sendLockRef.current) return;

    // ── Auth guard — giriş yapmamış kullanıcı AI çağrısı yapamaz ──
    if (!userState.user?.uid) {
      toast({
        title: "Giriş Yapmanız Gerekiyor",
        description: "AI sohbet özelliğini kullanmak için lütfen giriş yapın.",
        variant: "destructive",
      });
      return;
    }

    sendLockRef.current = true;
    setIsLoading(true);

    if (!online) {
      toast({ title: '⚠️ İnternet Bağlantısı Yok', description: 'Mesaj göndermek için internet bağlantısı gerekli.', variant: 'destructive' });
      sendLockRef.current = false;
      setIsLoading(false);
      return;
    }

    // Kredi kontrolü: AI function SERVER-SIDE yapar.
    // İstemci ön harcama YAPMAZ — çift ücretlendirme olmasın.
    const chatOpId = `chat_${userState.user?.uid || 'anon'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    setError(null);
    setInputText('');

    const userMsg: Message = { id: `user-${Date.now()}`, text, sender: 'user', timestamp: new Date() };

    // Firestore'a kaydet
    const uid = userState.user?.uid;
    if (uid) {
      saveChatMessage(uid, story.id, char.id, {
        id: userMsg.id, text: userMsg.text, sender: userMsg.sender,
        timestamp: userMsg.timestamp.toISOString(),
      });
    }

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    // API çağrısı için benzersiz request ID (çift iade önleme)
    const requestId = `chat-${Date.now()}`;

    try {
      const result = await sendToAPI(updatedHistory, chatOpId);

      const aiMsg: Message = { id: `ai-${Date.now()}`, text: result.text, sender: 'character', timestamp: new Date() };

      if (uid) {
        saveChatMessage(uid, story.id, char.id, {
          id: aiMsg.id, text: aiMsg.text, sender: aiMsg.sender,
          timestamp: aiMsg.timestamp.toISOString(),
        });
      }

      setMessages(prev => [...prev, aiMsg]);

      if (result.memoryUpdates && result.memoryUpdates.newFactsLearned.length > 0) {
        const facts = result.memoryUpdates.newFactsLearned;
        const memoryMsg: Message = {
          id: `mem-${Date.now()}`,
          text: `🧠 Hafıza Güncellendi: "${facts[0].fact.slice(0, 60)}${facts[0].fact.length > 60 ? '...' : ''}" öğrenildi! (${result.memoryUpdates.hiddenSecretsRemaining} sır kaldı)${facts.length > 1 ? ` +${facts.length - 1} bilgi daha` : ''}`,
          sender: 'system', timestamp: new Date(),
        };
        setMessages(prev => [...prev, memoryMsg]);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');

      // ── API hatasında jeton İADESİ (çift iade önlemli) ──
      if (!refundedRef.current.has(requestId)) {
        refundedRef.current.add(requestId);
        addCredits(5);
        toast({
          title: "Jeton İade Edildi",
          description: "AI yanıtı alınamadı. 5 jeton hesabınıza iade edildi.",
          variant: "default",
        });
      }

      const errMsg: Message = {
        id: `err-${Date.now()}`,
        text: '⚠️ ' + (err.message || 'Bağlantı hatası. Lütfen tekrar dene.'),
        sender: 'system', timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      sendLockRef.current = false;
    }
  }, [inputText, isLoading, messages, sendToAPI, online, spendCredits, addCredits, toast, userState.user?.uid, story.id, char.id]);

  // Reklam ödülü sonrası yarım kalan mesajı otomatik gönder
  const handleAdReward = (earned: number) => {
    if (userState.credits + earned >= 5) {
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Report handling ───────────────────────────────────────
  const openReportForMessage = (msg: Message) => {
    if (msg.sender !== 'character') return;
    setReportTargetMsg(msg);
    setReportReason(null);
    setIsReportSheetOpen(true);
  };

  const handleReportSubmit = async () => {
    if (!reportReason || !reportTargetMsg) return;
    setIsReportSheetOpen(false);
    try {
      await submitContentReport({
        uid: userState.user?.uid || null,
        storyId: story.id,
        storyTitle: story.title,
        chapterNumber: null,
        contentType: 'chat',
        characterName: char.name,
        contentPreview: reportTargetMsg.text.slice(0, 500),
        messageId: reportTargetMsg.id,
        reason: reportReason,
        createdAt: new Date().toISOString(),
      });
      toast({
        title: "Rapor İletildi",
        description: "Şikayetiniz incelenmek üzere ekibimize iletilmiştir.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Hata",
        description: "Rapor iletilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
    setReportReason(null);
    setReportTargetMsg(null);
  };

  // Character initials
  const initials = char.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[300] bg-background flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Immersive Blurred Background */}
      <div className="absolute inset-0 z-0">
        <Image src={story.imageUrl} alt="" fill className="object-cover blur-[100px] opacity-20 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
      </div>

      {/* ── Chat Header ──────────────────────────────────── */}
      <header className="relative z-10 px-5 py-4 flex items-center justify-between glass-morphism border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90" aria-label="Sohbetten çık">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-11 h-11 border-2 border-primary shadow-md ring-2 ring-primary/20">
                <AvatarImage src={story.imageUrl} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold text-sm">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background ring-1 ring-green-600/30" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-accent leading-none">{char.name}</h3>
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium leading-tight">{char.role} · {story.title}</span>
            </div>
          </div>
        </div>

        {/* ── Header menu: report chat ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors" aria-label="Sohbet menüsü">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl">
            <DropdownMenuItem
              onClick={() => {
                // Son AI mesajını bul ve raporla
                const lastAi = [...messages].reverse().find(m => m.sender === 'character');
                if (lastAi) openReportForMessage(lastAi);
              }}
              className="gap-2 text-sm cursor-pointer"
            >
              <Flag className="w-4 h-4" />
              İçeriği Bildir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Chat Area ────────────────────────────────────── */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5 no-scrollbar">
        <div className="self-center py-1.5 px-4 rounded-full bg-white/40 backdrop-blur-sm border border-white/20 text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm">
          <Sparkles className="w-3 h-3 text-primary" />
          {char.name} ile Sohbet
        </div>

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300',
              msg.sender === 'user' ? 'self-end items-end' : msg.sender === 'system' ? 'self-center items-center' : 'self-start items-start'
            )}
          >
            {msg.sender === 'system' ? (
              msg.text.startsWith('🧠') ? (
                <div className="px-4 py-2 rounded-full bg-purple-50/90 backdrop-blur-sm border border-purple-200 text-xs text-purple-700 font-medium flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                  <Brain className="w-3.5 h-3.5" />{msg.text}
                </div>
              ) : (
                <div className="px-4 py-2 rounded-full bg-red-50/90 backdrop-blur-sm border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />{msg.text}
                </div>
              )
            ) : (
              <>
                <div className={cn(
                  'px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm group relative',
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-tr-md'
                    : 'bg-white/85 dark:bg-[#1C1F2E]/90 backdrop-blur-md text-accent dark:text-gray-100 border border-white/60 dark:border-gray-700 rounded-tl-md'
                )}>
                  {msg.text}
                  {/* AI mesajına rapor butonu */}
                  {msg.sender === 'character' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openReportForMessage(msg); }}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30"
                      aria-label="Mesajı raporla"
                    >
                      <Flag className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-medium px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="self-start flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-md bg-white/60 dark:bg-[#1C1F2E]/80 backdrop-blur-md border border-white/40 dark:border-gray-700 shadow-sm animate-in fade-in duration-200">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">{char.name} yazıyor</span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}
        {error && !isLoading && (
          <button onClick={() => { setError(null); setMessages(prev => { const lastSystem = prev.findLastIndex(m => m.sender === 'system'); return lastSystem >= 0 ? prev.slice(0, lastSystem) : prev; }); }}
            className="self-center text-[10px] text-primary font-bold hover:underline">
            Hatayı temizle ve tekrar dene
          </button>
        )}
      </div>

      {/* ── Input Area ───────────────────────────────────── */}
      <footer className="relative z-10 px-5 pb-5 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-1 self-center bg-amber-50/90 dark:bg-amber-500/10 backdrop-blur-sm rounded-full border border-amber-200/60 dark:border-amber-500/30 shadow-sm">
            <Coins className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-current" />
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Mesaj başına 5 Jeton</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#1C1F2E]/90 backdrop-blur-md p-2 rounded-[2rem] shadow-xl border border-primary/10 dark:border-gray-700">
            <Input
              ref={inputRef} aria-label="Mesaj yaz" value={inputText}
              onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={`${char.name}'e bir şey yaz...`} disabled={isLoading}
              className="border-none bg-transparent focus-visible:ring-0 text-sm dark:text-white h-12 rounded-full px-4 placeholder:text-muted-foreground/50 dark:placeholder:text-gray-500"
            />
            <Button
              aria-label="Mesaj gönder" onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className={cn('w-12 h-12 rounded-full text-white shadow-lg transition-all p-0 flex items-center justify-center flex-shrink-0',
                inputText.trim() && !isLoading ? 'bg-primary shadow-primary/20 hover:scale-105 active:scale-95' : 'bg-muted-foreground/30 shadow-none')}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -mr-0.5 mt-0.5" />}
            </Button>
          </div>
        </div>
      </footer>

      {/* Yetersiz jeton upsell'i */}
      <AdRewardModal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} onReward={handleAdReward} />

      {/* ── Report Sheet ─────────────────────────────────── */}
      <Sheet open={isReportSheetOpen} onOpenChange={(open) => { setIsReportSheetOpen(open); if (!open) { setReportReason(null); setReportTargetMsg(null); } }}>
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
            {REPORT_REASONS.map((reason) => (
              <button key={reason} onClick={() => setReportReason(reason)}
                className={cn(
                  "w-full p-4 rounded-2xl text-sm font-bold transition-all text-left flex items-center justify-between",
                  reportReason === reason ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted/30 text-accent hover:bg-muted/50"
                )}>
                {reason}
                {reportReason === reason && <CheckCircle2 className="w-4 h-4" />}
              </button>
            ))}
            <Button disabled={!reportReason} onClick={handleReportSubmit}
              className="mt-6 w-full h-14 rounded-2xl bg-destructive text-white font-bold shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-95 transition-all">
              Raporu Gönder
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
