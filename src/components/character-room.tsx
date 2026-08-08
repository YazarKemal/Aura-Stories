'use client';

import { useEffect, useState } from 'react';
import { Story, CharacterRoster } from '@/lib/types';
import { getUnlockedCharacters, getTotalChapters } from '@/lib/character-roster';
import { useUserState, CHAPTER_UNLOCK_COST } from '@/lib/user-state';
import { getReaderPersona, type ReaderPersona } from '@/lib/reader-persona';
import { CharacterPanel } from './character-panel';
import { CharacterChatView } from './character-chat-view';
import { PurchaseModal } from './purchase-modal';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Coins,
  Unlock,
  Crown,
  ChevronRight,
  Lock,
  UserRound,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterRoomProps {
  story: Story;
  onBack: () => void;
}

export function CharacterRoom({ story, onBack }: CharacterRoomProps) {
  const totalChapters = getTotalChapters(story.id);
  const {
    userState,
    getCurrentChapter,
  } = useUserState();

  const currentChapter = getCurrentChapter(story.id);
  const storyState = userState.storyStates[story.id];
  const hasFullAccess = storyState?.hasFullAccess || false;

  const [activeCharacter, setActiveCharacter] = useState<CharacterRoster | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState<CharacterRoster | null>(null);
  const [readerPersona, setReaderPersona] = useState<ReaderPersona | null>(null);

  // Karakter sohbetindeki kullanıcı artık anonim bir "okuyucu" değildir.
  // Aynı Reader Persona chat-client tarafından AI context'ine de eklenir.
  useEffect(() => {
    let cancelled = false;
    void getReaderPersona().then((persona) => {
      if (!cancelled) setReaderPersona(persona);
    });
    return () => { cancelled = true; };
  }, [userState.user?.uid]);

  // Characters unlocked at or before the current chapter
  const charactersWithStatus = getUnlockedCharacters(story.id, currentChapter);

  const handleSelectCharacter = (character: CharacterRoster) => {
    const status = charactersWithStatus.find(c => c.character.id === character.id);
    if (status?.isUnlocked) {
      setActiveCharacter(character);
      setPendingCharacter(null);
    } else {
      setPendingCharacter(character);
      setIsPurchaseModalOpen(true);
    }
  };

  const handlePurchaseModalClose = () => {
    setIsPurchaseModalOpen(false);
    setPendingCharacter(null);
  };

  const handleBackToPanel = () => {
    setActiveCharacter(null);
  };

  if (activeCharacter) {
    return (
      <CharacterChatView
        story={story}
        activeCharacter={activeCharacter}
        onBack={handleBackToPanel}
      />
    );
  }

  const hasNextChapter = currentChapter < totalChapters;
  const nextChapter = currentChapter + 1;
  const canAffordNext = userState.credits >= CHAPTER_UNLOCK_COST;

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-background flex flex-col animate-in fade-in duration-500 overflow-hidden">
        {/* Header */}
        <header className="relative z-10 px-5 py-4 flex items-center justify-between glass-morphism border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90"
              aria-label="Geri dön"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-headline font-bold text-accent">
                  {story.title}
                </h2>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Karakter Odası · Canlı Evren
              </span>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-xs px-2 py-1 gap-1">
            <Coins className="w-3 h-3 fill-amber-500" />
            {userState.credits}
          </Badge>
        </header>

        {/* Chapter Progress Bar — View Only, No Manual Navigation */}
        <div className="px-5 py-3 flex items-center justify-between bg-muted/20 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent">
              Okuma İlerlemen
            </span>
            {hasFullAccess && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] gap-1 h-5">
                <Crown className="w-3 h-3" />
                Tam Erişim
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Badge className={cn(
              'text-white border-none text-xs font-bold px-3 py-1 min-w-[70px] justify-center',
              hasFullAccess ? 'bg-yellow-500' : 'bg-primary'
            )}>
              {hasFullAccess
                ? `Bölüm 1-${totalChapters}`
                : `Bölüm ${currentChapter}/${totalChapters}`
              }
            </Badge>

            {!hasFullAccess && hasNextChapter && (
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className={cn(
                  'p-1.5 rounded-full border transition-all active:scale-90 flex items-center gap-1 px-3',
                  canAffordNext
                    ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                    : 'bg-muted/30 border-border/30 text-muted-foreground'
                )}
                title={canAffordNext
                  ? `${CHAPTER_UNLOCK_COST} kredi ile Bölüm ${nextChapter}'i aç`
                  : 'Yetersiz kredi'
                }
              >
                {canAffordNext ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {!hasFullAccess && (
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="p-1.5 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200 transition-all active:scale-90"
                title="Jetonla tam erişim aç"
              >
                <Crown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reader Persona — kullanıcı hikâye evreninin bir katılımcısıdır */}
        {readerPersona && (
          <div className="px-5 pt-4 flex-shrink-0">
            <div className="aura-premium-surface rounded-[1.4rem] px-4 py-3 flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <UserRound className="w-5 h-5" />
                <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-background border border-primary/25 flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-primary font-black">Sen de bu evrendesin</span>
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-black text-foreground truncate">{readerPersona.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{readerPersona.role}</span>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/15 text-[9px] shrink-0">Persona Aktif</Badge>
            </div>
          </div>
        )}

        {/* Character Panel */}
        <div className="py-4 flex-shrink-0">
          <CharacterPanel
            characters={charactersWithStatus}
            activeCharacterId={null}
            onSelectCharacter={handleSelectCharacter}
            currentChapter={currentChapter}
            totalChapters={totalChapters}
          />
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4 pb-20">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-headline font-bold text-accent">
              Bir Karakter Seç
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px]">
              Karakterler artık seni hikâyenin dışındaki bir okuyucu olarak değil, kendi dünyalarına girmiş gerçek bir kişi olarak tanıyacak. Konuşmalar ilerledikçe öğrendiklerini de hatırlayacaklar.
            </p>
          </div>

          {!hasFullAccess && (
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="mt-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              {hasNextChapter ? 'Yeni Bölüm Aç' : 'Tam Erişim Al'}
            </button>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              Açık
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary ml-1" />
              Kilitli
            </span>
            <span className="flex items-center gap-1 ml-1">
              <Coins className="w-3 h-3 fill-amber-500" />
              {CHAPTER_UNLOCK_COST} kredi
            </span>
          </div>
        </div>
      </div>

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={handlePurchaseModalClose}
        storyId={story.id}
        storyTitle={story.title}
        totalChapters={totalChapters}
        characterName={pendingCharacter?.name}
        characterChapter={pendingCharacter?.unlockedAtChapter}
      />
    </>
  );
}
