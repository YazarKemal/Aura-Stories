'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserState } from '@/lib/user-state';

export function DailyGiftBridge() {
  const { toast } = useToast();
  const { userState, claimDailyGift, isGiftClaimedToday } = useUserState();
  const busyRef = useRef(false);

  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button') as HTMLButtonElement | null;
      if (!button) return;

      const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (label !== 'Hediyeni Al') return;

      event.preventDefault();
      event.stopPropagation();

      if (busyRef.current) return;
      if (!userState.user?.uid) {
        toast({
          title: 'Giriş yapmanız gerekiyor',
          description: 'Günlük Aura Hediyeni hesabına eklemek için önce giriş yapmalısın.',
          variant: 'destructive',
        });
        return;
      }

      if (isGiftClaimedToday) {
        toast({
          title: 'Bugünkü hediye zaten alındı',
          description: 'Yeni Aura Hediyen yarın tekrar hazır olacak.',
        });
        return;
      }

      busyRef.current = true;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Hediye alınıyor...';

      try {
        const ok = await claimDailyGift();
        if (ok) {
          toast({
            title: 'Günlük Aura Hediyen alındı',
            description: '+50 jeton hesabına eklendi.',
          });
        } else {
          toast({
            title: 'Hediye alınamadı',
            description: 'Ödül servisine ulaşılamadı veya bugünkü hediyeyi daha önce aldın.',
            variant: 'destructive',
          });
          button.disabled = false;
          button.textContent = originalText || 'Hediyeni Al';
        }
      } catch (error) {
        console.error('[DailyGift] Profil ödülü alınamadı:', error);
        toast({
          title: 'Hediye alınamadı',
          description: 'Ödül servisine şu anda ulaşılamıyor. Lütfen bağlantını kontrol et.',
          variant: 'destructive',
        });
        button.disabled = false;
        button.textContent = originalText || 'Hediyeni Al';
      } finally {
        busyRef.current = false;
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [claimDailyGift, isGiftClaimedToday, toast, userState.user?.uid]);

  return null;
}
