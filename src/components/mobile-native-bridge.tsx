'use client';

import { useEffect, useRef } from 'react';
import { shareAuraStoryImage } from '@/lib/native-share';
import { speakStoryText, stopStorySpeech } from '@/lib/native-tts';
import { useToast } from '@/hooks/use-toast';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function createStoryCard(dialog: HTMLElement): string {
  const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement | null;
  const quote = textarea?.value.trim() || 'Aura Stories';
  const meta = Array.from(dialog.querySelectorAll('.mt-auto span'))
    .map((node) => node.textContent?.trim())
    .filter((value): value is string => Boolean(value));
  const storyTitle = meta[0] || 'Aura Stories';
  const author = meta[1] || '';

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Paylaşım görseli oluşturulamadı.');

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#171020');
  gradient.addColorStop(0.48, '#4D2A74');
  gradient.addColorStop(1, '#0B0C10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  const glow = ctx.createRadialGradient(850, 260, 0, 850, 260, 620);
  glow.addColorStop(0, 'rgba(168,85,247,0.42)');
  glow.addColorStop(1, 'rgba(168,85,247,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1000);

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = '700 46px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AURA STORIES', 92, 150);

  ctx.fillStyle = '#C084FC';
  ctx.fillRect(92, 184, 112, 8);

  const quoteLength = quote.length;
  const quoteSize = quoteLength > 210 ? 48 : quoteLength > 120 ? 56 : 66;
  ctx.font = `700 ${quoteSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';

  const lines = wrapText(ctx, quote, 850).slice(0, 11);
  const lineHeight = Math.round(quoteSize * 1.42);
  const totalHeight = lines.length * lineHeight;
  let y = Math.max(520, 960 - totalHeight / 2);

  ctx.fillStyle = 'rgba(192,132,252,0.85)';
  ctx.font = '700 130px Georgia, serif';
  ctx.fillText('“', 540, y - 80);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${quoteSize}px Georgia, serif`;
  for (const line of lines) {
    ctx.fillText(line, 540, y);
    y += lineHeight;
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 46px sans-serif';
  ctx.fillText(storyTitle.slice(0, 42), 92, 1650);

  if (author) {
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '500 32px sans-serif';
    ctx.fillText(author.slice(0, 55), 92, 1704);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(92, 1780, 896, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = '600 27px sans-serif';
  ctx.fillText('AuraStories.com', 92, 1840);

  return canvas.toDataURL('image/png', 1);
}

function getReadableStoryText(): string {
  const paragraphs = Array.from(document.querySelectorAll('.group\\/para p'))
    .map((node) => node.textContent?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(paragraphs)).join('\n\n');
}

function getAudioPanel(button: HTMLButtonElement): HTMLElement | null {
  let node: HTMLElement | null = button.parentElement;
  while (node) {
    if (node.textContent?.includes('Sesli Okuma') && node.querySelector('button')) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function MobileNativeBridge() {
  const { toast } = useToast();
  const ttsActiveRef = useRef(false);

  useEffect(() => {
    const stopTtsSafely = async () => {
      if (!ttsActiveRef.current) return;
      ttsActiveRef.current = false;
      try {
        await stopStorySpeech();
      } catch (error) {
        console.warn('[AuraTTS] Ses durdurulamadı:', error);
      }
    };

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button') as HTMLButtonElement | null;
      if (!button) return;

      const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';

      // Android/Web Instagram Story paylaşımı
      if (label.includes('Instagram Hikayesi Olarak Paylaş')) {
        if (button.dataset.auraSharing === 'true') return;
        const dialog = button.closest('[role="dialog"]') as HTMLElement | null;
        if (!dialog) return;

        event.preventDefault();
        event.stopPropagation();
        button.dataset.auraSharing = 'true';
        button.setAttribute('aria-busy', 'true');
        const previousOpacity = button.style.opacity;
        button.style.opacity = '0.65';

        try {
          const dataUrl = createStoryCard(dialog);
          await shareAuraStoryImage(dataUrl);
        } catch (error) {
          console.error('[AuraShare] Instagram paylaşımı başarısız:', error);
          toast({
            title: 'Paylaşım başarısız',
            description: error instanceof Error ? error.message : 'Instagram paylaşımı başlatılamadı.',
            variant: 'destructive',
          });
        } finally {
          delete button.dataset.auraSharing;
          button.removeAttribute('aria-busy');
          button.style.opacity = previousOpacity;
        }
        return;
      }

      // Hikâyeden çıkarken sesi kes.
      if (button.getAttribute('aria-label') === 'Geri dön') {
        void stopTtsSafely();
        return;
      }

      // Mevcut sesli okuma panelini gerçek TTS motoruna bağla.
      const audioPanel = getAudioPanel(button);
      if (!audioPanel) return;

      const panelButtons = Array.from(audioPanel.querySelectorAll('button')) as HTMLButtonElement[];
      const playButton = panelButtons.find((candidate) =>
        candidate.className.includes('w-12') && candidate.className.includes('h-12')
      );

      if (button === playButton) {
        if (ttsActiveRef.current) {
          await stopTtsSafely();
          return;
        }

        const storyText = getReadableStoryText();
        if (!storyText) {
          toast({
            title: 'Sesli okuma başlatılamadı',
            description: 'Okunacak hikâye metni bulunamadı.',
            variant: 'destructive',
          });
          return;
        }

        const speedButton = panelButtons.find((candidate) => /^(1|1\.25|1\.5|2)x$/.test(candidate.textContent?.trim() || ''));
        const rate = Number.parseFloat(speedButton?.textContent || '1') || 1;

        try {
          await speakStoryText(storyText, rate);
          ttsActiveRef.current = true;
        } catch (error) {
          ttsActiveRef.current = false;
          console.error('[AuraTTS] Sesli okuma başlatılamadı:', error);
          toast({
            title: 'Sesli okuma başlatılamadı',
            description: error instanceof Error ? error.message : 'Android ses motoru kullanılamadı.',
            variant: 'destructive',
          });
        }
        return;
      }

      // Player kapatma düğmesi: paneli kapatırken TTS'yi de durdur.
      if (button.className.includes('p-1.5') && button.className.includes('rounded-full')) {
        void stopTtsSafely();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) void stopTtsSafely();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void stopTtsSafely();
    };
  }, [toast]);

  return null;
}
