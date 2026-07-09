'use client';

import { useState } from 'react';
import { useUserState, CHAPTER_UNLOCK_COST, FULL_ACCESS_COST } from '@/lib/user-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Lock, Crown, Sparkles, BookOpen, Unlock, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  totalChapters: number;
  /** If a specific character name is provided, this is a character-unlock prompt */
  characterName?: string;
  characterChapter?: number;
}

export function PurchaseModal({
  isOpen,
  onClose,
  storyId,
  storyTitle,
  totalChapters,
  characterName,
  characterChapter,
}: PurchaseModalProps) {
  const { userState, unlockNextChapter, buyFullAccess, getCurrentChapter } = useUserState();
  const [purchaseResult, setPurchaseResult] = useState<'success' | 'insufficient' | null>(null);
  const [purchaseType, setPurchaseType] = useState<'chapter' | 'full' | null>(null);

  const currentChapter = getCurrentChapter(storyId);
  const nextChapter = currentChapter + 1;
  const storyState = userState.storyStates[storyId];
  const hasFullAccess = storyState?.hasFullAccess || false;
  const canUnlockNext = nextChapter <= totalChapters && !hasFullAccess;

  // Calculate full access cost (discounted for already unlocked chapters)
  const alreadyUnlocked = storyState?.unlockedChapters?.length || 1;
  const fullAccessCost = Math.max(
    FULL_ACCESS_COST - alreadyUnlocked * CHAPTER_UNLOCK_COST,
    Math.floor(FULL_ACCESS_COST / 2)
  );

  const handleUnlockChapter = () => {
    if (userState.credits < CHAPTER_UNLOCK_COST) {
      setPurchaseResult('insufficient');
      setPurchaseType('chapter');
      return;
    }
    const ok = unlockNextChapter(storyId, totalChapters);
    if (ok) {
      setPurchaseResult('success');
      setPurchaseType('chapter');
      setTimeout(() => {
        setPurchaseResult(null);
        setPurchaseType(null);
        onClose();
      }, 1200);
    }
  };

  const handleBuyFullAccess = () => {
    if (userState.credits < fullAccessCost) {
      setPurchaseResult('insufficient');
      setPurchaseType('full');
      return;
    }
    const ok = buyFullAccess(storyId);
    if (ok) {
      setPurchaseResult('success');
      setPurchaseType('full');
      setTimeout(() => {
        setPurchaseResult(null);
        setPurchaseType(null);
        onClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    setPurchaseResult(null);
    setPurchaseType(null);
    onClose();
  };

  const isProcessing = purchaseResult === 'success';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90%] rounded-[2.5rem] p-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-8 pb-6">
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-xs px-3 py-1 gap-1.5">
              <Coins className="w-3.5 h-3.5 fill-amber-500" />
              {userState.credits} Kredi
            </Badge>
          </div>

          <div className="flex flex-col items-center gap-3 text-center mt-2">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg',
              isProcessing && purchaseType === 'full'
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-primary/10 text-primary'
            )}>
              {isProcessing && purchaseType === 'full' ? (
                <Crown className="w-8 h-8 animate-bounce" />
              ) : isProcessing && purchaseType === 'chapter' ? (
                <Unlock className="w-8 h-8 animate-bounce" />
              ) : characterName ? (
                <Lock className="w-8 h-8" />
              ) : (
                <BookOpen className="w-8 h-8" />
              )}
            </div>

            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-headline font-black text-accent">
                {isProcessing
                  ? '✅ İşlem Başarılı!'
                  : purchaseResult === 'insufficient'
                    ? '⚠️ Yetersiz Kredi'
                    : characterName
                      ? `${characterName} Kilitli`
                      : 'Yeni Bölüm Aç'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed px-2">
                {isProcessing && purchaseType === 'full' ? (
                  <>
                    <Crown className="w-4 h-4 inline text-yellow-500 mr-1" />
                    Tüm hikayeye tam erişim sağlandı! Bütün karakterler açıldı.
                  </>
                ) : isProcessing && purchaseType === 'chapter' ? (
                  <>
                    <Unlock className="w-4 h-4 inline text-green-500 mr-1" />
                    Bölüm {nextChapter} açıldı! Yeni karakterler sohbete hazır.
                  </>
                ) : characterName ? (
                  <>
                    {characterName}, hikayenin{' '}
                    <span className="font-bold text-accent">{characterChapter}. bölümünde</span>{' '}
                    görünür. Bu bölümü açmak için kredi kullan.
                  </>
                ) : (
                  'Hikayede ilerlemek için jetonlarınla yeni bölümler aç veya tam erişim kilidini kaldır.'
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Purchase options */}
        <div className="p-6 pt-4 flex flex-col gap-3">
          {purchaseResult === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in zoom-in-95 duration-300">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              <span className="text-sm font-bold text-accent">
                Keyifli okumalar! ✨
              </span>
            </div>
          ) : purchaseResult === 'insufficient' ? (
            <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in duration-300">
              <p className="text-sm text-center text-muted-foreground leading-relaxed">
                {purchaseType === 'chapter'
                  ? `Bu işlem için ${CHAPTER_UNLOCK_COST} kredi gerekiyor. Bakiyeniz: ${userState.credits}`
                  : `Tam erişim için ${fullAccessCost} kredi gerekiyor. Bakiyeniz: ${userState.credits}`}
              </p>
              <Button
                onClick={handleClose}
                variant="outline"
                className="rounded-2xl border-primary/30 text-accent font-bold"
              >
                Daha Sonra
              </Button>
            </div>
          ) : (
            <>
              {/* Option 1: Unlock next chapter */}
              <button
                onClick={handleUnlockChapter}
                disabled={!canUnlockNext || userState.credits < CHAPTER_UNLOCK_COST}
                className={cn(
                  'w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all',
                  'hover:scale-[1.01] active:scale-[0.99]',
                  canUnlockNext && userState.credits >= CHAPTER_UNLOCK_COST
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50'
                    : 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Unlock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-accent">
                    Bölüm {nextChapter}'i Aç
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {canUnlockNext
                      ? 'Bir sonraki bölümü ve karakterlerini aç'
                      : 'Tüm bölümler zaten açık'}
                  </div>
                </div>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs gap-1 flex-shrink-0">
                  <Coins className="w-3 h-3 fill-amber-500" />
                  {CHAPTER_UNLOCK_COST}
                </Badge>
              </button>

              {/* Option 2: Buy full access */}
              <button
                onClick={handleBuyFullAccess}
                disabled={hasFullAccess || userState.credits < fullAccessCost}
                className={cn(
                  'w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all',
                  'hover:scale-[1.01] active:scale-[0.99]',
                  !hasFullAccess && userState.credits >= fullAccessCost
                    ? 'border-yellow-400/60 bg-gradient-to-r bg-brand-primary/5 hover:border-yellow-500'
                    : hasFullAccess
                      ? 'border-green-300/60 bg-green-50/50 cursor-default'
                      : 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-accent flex items-center gap-1.5">
                    {hasFullAccess ? (
                      <>
                        Tam Erişim Aktif
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      </>
                    ) : (
                      'Hikayenin Tamamını Satın Al'
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {hasFullAccess
                      ? 'Tüm bölümler ve karakterler açık'
                      : 'Tüm bölümleri ve karakterleri tek seferde aç'}
                  </div>
                </div>
                {hasFullAccess ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-xs flex-shrink-0">
                    ✓ Aktif
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold text-xs gap-1 flex-shrink-0">
                    <Coins className="w-3 h-3 fill-yellow-500" />
                    {fullAccessCost}
                  </Badge>
                )}
              </button>

              {/* Hint */}
              <p className="text-[10px] text-center text-muted-foreground pt-1">
                Bölüm başına {CHAPTER_UNLOCK_COST} kredi • Tam erişim daha avantajlı
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
