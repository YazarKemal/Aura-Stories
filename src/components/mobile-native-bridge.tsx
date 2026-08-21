'use client';

import { useEffect, useRef } from 'react';
import { shareAuraStoryImage } from '@/lib/native-share';
import {
  addTtsProgressListener,
  speakStoryText,
  stopStorySpeech,
  type TtsProgressEvent,
} from '@/lib/native-tts';
import { useToast } from '@/hooks/use-toast';

interface TtsParagraphSegment {
  element: HTMLElement;
  wrapper: HTMLElement;
  text: string;
  start: number;
  end: number;
}

interface TtsSpeechPlan {
  text: string;
  segments: TtsParagraphSegment[];
}

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

function buildSpeechPlan(): TtsSpeechPlan {
  const paragraphNodes = Array.from(
    document.querySelectorAll<HTMLElement>('[class*="group/para"] p')
  ).filter((node) => Boolean(node.textContent?.trim()));

  const segments: TtsParagraphSegment[] = [];
  const chunks: string[] = [];
  let cursor = 0;

  paragraphNodes.forEach((element, index) => {
    const text = element.textContent?.trim() || '';
    const wrapper = element.closest<HTMLElement>('[class*="group/para"]') || element;
    if (index > 0) cursor += 2; // "\n\n"
    const start = cursor;
    cursor += text.length;
    const end = cursor;
    chunks.push(text);
    segments.push({ element, wrapper, text, start, end });
  });

  return {
    text: chunks.join('\n\n'),
    segments,
  };
}

function getAudioPanel(button: HTMLButtonElement): HTMLElement | null {
  let node: HTMLElement | null = button.parentElement;
  while (node) {
    if (node.textContent?.includes('Sesli Okuma') && node.querySelector('[role="progressbar"]')) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function findVisibleAudioPanel(): HTMLElement | null {
  const progressBars = Array.from(document.querySelectorAll<HTMLElement>('[role="progressbar"]'));
  for (const progressBar of progressBars) {
    let node: HTMLElement | null = progressBar.parentElement;
    while (node) {
      if (node.textContent?.includes('Sesli Okuma')) return node;
      node = node.parentElement;
    }
  }
  return null;
}

function getPlayButton(panel: HTMLElement | null): HTMLButtonElement | null {
  if (!panel) return null;
  const buttons = Array.from(panel.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find((candidate) =>
    candidate.className.includes('w-12') && candidate.className.includes('h-12')
  ) || null;
}

function getSpeedButton(panel: HTMLElement | null): HTMLButtonElement | null {
  if (!panel) return null;
  const buttons = Array.from(panel.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find((candidate) =>
    /^(1|1\.25|1\.5|2)x$/.test(candidate.textContent?.trim() || '')
  ) || null;
}

function getPlaybackRate(panel: HTMLElement | null): number {
  const button = getSpeedButton(panel);
  return Number.parseFloat(button?.textContent || '1') || 1;
}

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function estimateSpeechDuration(text: string, rate: number): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 122 * Math.max(0.5, rate);
  return Math.max(1, (wordCount / wordsPerMinute) * 60);
}

function updateAudioPanel(
  panel: HTMLElement | null,
  progressPercent: number,
  elapsedSeconds: number,
  totalSeconds: number,
  totalIsEstimate: boolean,
) {
  if (!panel) return;
  const percent = Math.max(0, Math.min(100, progressPercent));

  const progressRoot = panel.querySelector('[role="progressbar"]') as HTMLElement | null;
  if (progressRoot) {
    progressRoot.setAttribute('aria-valuenow', String(Math.round(percent)));
    const indicator = progressRoot.firstElementChild as HTMLElement | null;
    if (indicator) indicator.style.transform = `translateX(-${100 - percent}%)`;
  }

  const timeLabels = Array.from(panel.querySelectorAll('span'))
    .filter((node) => /^~?\d{2,}:\d{2}$/.test(node.textContent?.trim() || '')) as HTMLElement[];
  if (timeLabels[0]) timeLabels[0].textContent = formatClock(elapsedSeconds);
  if (timeLabels[1]) {
    timeLabels[1].textContent = `${totalIsEstimate ? '~' : ''}${formatClock(totalSeconds)}`;
  }
}

function installTtsHighlightStyle(): () => void {
  const existing = document.getElementById('aura-tts-highlight-style');
  if (existing) return () => {};

  const style = document.createElement('style');
  style.id = 'aura-tts-highlight-style';
  style.textContent = `
    [data-aura-tts-active="true"] {
      background: hsl(var(--primary) / 0.09) !important;
      box-shadow: inset 3px 0 0 hsl(var(--primary));
      transition: background-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
    }
    [data-aura-tts-active="true"] > p {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
  return () => style.remove();
}

export function MobileNativeBridge() {
  const { toast } = useToast();
  const ttsActiveRef = useRef(false);
  const ttsFinishingRef = useRef(false);
  const ttsStartedAtRef = useRef(0);
  const ttsElapsedBeforeRestartRef = useRef(0);
  const ttsEstimatedDurationRef = useRef(0);
  const ttsInitialDurationRef = useRef(0);
  const ttsProgressRef = useRef(0);
  const speechBaseOffsetRef = useRef(0);
  const speechPlanRef = useRef<TtsSpeechPlan | null>(null);
  const activeAudioPanelRef = useRef<HTMLElement | null>(null);
  const activeParagraphRef = useRef<HTMLElement | null>(null);
  const activeSegmentIndexRef = useRef(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastManualScrollAtRef = useRef(0);

  useEffect(() => {
    const removeHighlightStyle = installTtsHighlightStyle();
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    let disposed = false;

    const getElapsedSeconds = () => {
      if (!ttsStartedAtRef.current) return ttsElapsedBeforeRestartRef.current;
      return ttsElapsedBeforeRestartRef.current + Math.max(0, (Date.now() - ttsStartedAtRef.current) / 1000);
    };

    const clearElapsedTimer = () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };

    const clearParagraphHighlight = () => {
      if (activeParagraphRef.current) {
        activeParagraphRef.current.removeAttribute('data-aura-tts-active');
        activeParagraphRef.current = null;
      }
    };

    const setActiveParagraphForOffset = (globalOffset: number) => {
      const plan = speechPlanRef.current;
      if (!plan?.segments.length) return;

      let index = plan.segments.findIndex((segment) =>
        globalOffset >= segment.start && globalOffset < segment.end
      );
      if (index < 0 && globalOffset >= plan.segments[plan.segments.length - 1].end) {
        index = plan.segments.length - 1;
      }
      if (index < 0 || (index === activeSegmentIndexRef.current && Boolean(activeParagraphRef.current))) return;

      const segment = plan.segments[index];
      if (activeParagraphRef.current && activeParagraphRef.current !== segment.wrapper) {
        activeParagraphRef.current.removeAttribute('data-aura-tts-active');
      }

      activeSegmentIndexRef.current = index;
      activeParagraphRef.current = segment.wrapper;
      segment.wrapper.setAttribute('data-aura-tts-active', 'true');

      // Kullanıcı son 3 saniyede manuel kaydırdıysa otomatik takip müdahale etmez.
      if (Date.now() - lastManualScrollAtRef.current < 3000) return;

      const rect = segment.wrapper.getBoundingClientRect();
      const safeTop = window.innerHeight * 0.2;
      const safeBottom = window.innerHeight * 0.78;
      if (rect.top < safeTop || rect.bottom > safeBottom) {
        segment.wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const renderProgress = (totalIsEstimate = true) => {
      const elapsed = getElapsedSeconds();
      updateAudioPanel(
        activeAudioPanelRef.current,
        ttsProgressRef.current,
        elapsed,
        Math.max(elapsed, ttsEstimatedDurationRef.current),
        totalIsEstimate,
      );
    };

    const startElapsedTimer = () => {
      clearElapsedTimer();
      elapsedTimerRef.current = setInterval(() => {
        if (!ttsActiveRef.current) return;
        // Timer yalnızca geçen süreyi günceller. Progress yüzdesinin tek kaynağı
        // Android TTS onRangeStart eventidir.
        renderProgress(true);
      }, 400);
    };

    const syncReactPlayButtonToStopped = () => {
      const playButton = getPlayButton(activeAudioPanelRef.current);
      if (!playButton) return;
      ttsFinishingRef.current = true;
      setTimeout(() => {
        playButton.click();
        setTimeout(() => {
          ttsFinishingRef.current = false;
        }, 0);
      }, 50);
    };

    const stopTtsSafely = async (resetPanel = true) => {
      const wasActive = ttsActiveRef.current;
      ttsActiveRef.current = false;
      clearElapsedTimer();
      if (wasActive) {
        try {
          await stopStorySpeech();
        } catch (error) {
          console.warn('[AuraTTS] Ses durdurulamadı:', error);
        }
      }
      clearParagraphHighlight();

      if (resetPanel) {
        ttsProgressRef.current = 0;
        ttsElapsedBeforeRestartRef.current = 0;
        ttsStartedAtRef.current = 0;
        const panel = activeAudioPanelRef.current;
        const estimatedTotal = Math.max(1, ttsInitialDurationRef.current || ttsEstimatedDurationRef.current);
        updateAudioPanel(panel, 0, 0, estimatedTotal, true);
        // ReadingView kendi isPlaying state'iyle yeniden render olduğunda eski demo
        // değerlerini basmasın; render sonrasında native görünümü tekrar uygula.
        setTimeout(() => updateAudioPanel(panel, 0, 0, estimatedTotal, true), 100);
      }
    };

    const beginSpeech = async (
      plan: TtsSpeechPlan,
      rate: number,
      baseOffset = 0,
      preserveElapsed = false,
    ) => {
      if (!plan.text) {
        toast({
          title: 'Sesli okuma başlatılamadı',
          description: 'Okunacak hikâye metni bulunamadı.',
          variant: 'destructive',
        });
        return;
      }

      speechPlanRef.current = plan;
      speechBaseOffsetRef.current = Math.max(0, Math.min(baseOffset, plan.text.length - 1));
      activeSegmentIndexRef.current = Math.max(
        0,
        plan.segments.findIndex((segment) => speechBaseOffsetRef.current >= segment.start && speechBaseOffsetRef.current < segment.end),
      );

      const speechText = plan.text.slice(speechBaseOffsetRef.current);
      const remainingEstimate = estimateSpeechDuration(speechText, rate);
      const carriedElapsed = preserveElapsed ? ttsElapsedBeforeRestartRef.current : 0;
      if (!preserveElapsed) {
        ttsElapsedBeforeRestartRef.current = 0;
        ttsProgressRef.current = speechBaseOffsetRef.current > 0
          ? (speechBaseOffsetRef.current / Math.max(1, plan.text.length)) * 100
          : 0;
        ttsInitialDurationRef.current = estimateSpeechDuration(plan.text, rate);
        ttsEstimatedDurationRef.current = ttsInitialDurationRef.current;
      } else {
        ttsEstimatedDurationRef.current = Math.max(
          carriedElapsed + remainingEstimate,
          carriedElapsed + 1,
        );
      }

      ttsStartedAtRef.current = Date.now();
      ttsActiveRef.current = true;
      renderProgress(true);

      try {
        await speakStoryText(speechText, rate);
        startElapsedTimer();
        setActiveParagraphForOffset(speechBaseOffsetRef.current);
        // Play click'i ReadingView'de isPlaying state'ini değiştirerek player'ı
        // yeniden render eder. Sonrasında doğru native progress'i tekrar uygula.
        setTimeout(() => renderProgress(true), 100);
      } catch (error) {
        ttsActiveRef.current = false;
        clearElapsedTimer();
        clearParagraphHighlight();
        console.error('[AuraTTS] Sesli okuma başlatılamadı:', error);
        syncReactPlayButtonToStopped();
        toast({
          title: 'Sesli okuma başlatılamadı',
          description: error instanceof Error ? error.message : 'Android ses motoru kullanılamadı.',
          variant: 'destructive',
        });
      }
    };

    const restartAtCurrentParagraphWithRate = async (rate: number) => {
      const plan = speechPlanRef.current;
      if (!plan?.segments.length || !ttsActiveRef.current) return;

      const elapsed = getElapsedSeconds();
      const segment = plan.segments[Math.max(0, activeSegmentIndexRef.current)];
      ttsActiveRef.current = false;
      clearElapsedTimer();
      try {
        await stopStorySpeech();
      } catch (error) {
        console.warn('[AuraTTS] Hız değişiminde ses durdurulamadı:', error);
      }

      ttsElapsedBeforeRestartRef.current = elapsed;
      ttsStartedAtRef.current = 0;
      await beginSpeech(plan, rate, segment.start, true);
    };

    const handleProgress = (event: TtsProgressEvent) => {
      const plan = speechPlanRef.current;
      if (!plan || !activeAudioPanelRef.current) return;

      if (event.state === 'error') {
        ttsActiveRef.current = false;
        clearElapsedTimer();
        clearParagraphHighlight();
        syncReactPlayButtonToStopped();
        toast({
          title: 'Sesli okuma durdu',
          description: 'Android ses motoru okumayı tamamlayamadı.',
          variant: 'destructive',
        });
        return;
      }

      if (event.state === 'done') {
        const elapsed = getElapsedSeconds();
        const panel = activeAudioPanelRef.current;
        ttsActiveRef.current = false;
        clearElapsedTimer();
        ttsProgressRef.current = 100;
        ttsEstimatedDurationRef.current = elapsed;
        updateAudioPanel(panel, 100, elapsed, elapsed, false);
        const lastSegment = plan.segments[plan.segments.length - 1];
        if (lastSegment) setActiveParagraphForOffset(lastSegment.start);
        setTimeout(clearParagraphHighlight, 900);
        syncReactPlayButtonToStopped();
        // Programatik play click'i React ikonunu durdurulmuş duruma çekerken
        // player tekrar render olabilir; tamamlanmış süreyi koru.
        setTimeout(() => updateAudioPanel(panel, 100, elapsed, elapsed, false), 140);
        return;
      }

      if (event.state !== 'progress' || !ttsActiveRef.current) return;

      const nativeLength = Math.max(1, event.length || 1);
      const relativeEnd = Math.max(0, Math.min(nativeLength, event.end));
      const globalStart = Math.min(plan.text.length, speechBaseOffsetRef.current + Math.max(0, event.start));
      const globalEnd = Math.min(plan.text.length, speechBaseOffsetRef.current + relativeEnd);
      const fraction = Math.max(0, Math.min(1, globalEnd / Math.max(1, plan.text.length)));

      ttsProgressRef.current = fraction * 100;
      setActiveParagraphForOffset(globalStart);

      const elapsed = getElapsedSeconds();
      // Yalnızca ilk kalibrasyon penceresinde (%8–%16) toplam süre tahminini güncelle.
      // Pencere kapandıktan sonra TTS tamamlanana kadar toplam süre sabit kalır.
      if (fraction >= 0.08 && fraction <= 0.16 && elapsed > 3) {
        const observedTotal = elapsed / fraction;
        const baseEstimate = Math.max(elapsed, ttsInitialDurationRef.current);
        const minimum = Math.max(elapsed, baseEstimate * 0.85);
        const maximum = Math.max(minimum, baseEstimate * 1.25);
        const clampedObserved = Math.max(minimum, Math.min(maximum, observedTotal));
        const previous = Math.max(elapsed, ttsEstimatedDurationRef.current || clampedObserved);
        ttsEstimatedDurationRef.current = previous * 0.60 + clampedObserved * 0.40;
      }

      renderProgress(true);
    };

    void addTtsProgressListener(handleProgress).then((handle) => {
      if (disposed) {
        if (handle) void handle.remove();
        return;
      }
      listenerHandle = handle;
    }).catch((error) => {
      console.warn('[AuraTTS] Progress listener kurulamadı:', error);
    });

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button') as HTMLButtonElement | null;
      if (!button) return;

      const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';

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

      if (button.getAttribute('aria-label') === 'Geri dön') {
        void stopTtsSafely();
        return;
      }

      // Audio player ilk açıldığında hard-coded demo sürelerini anında gerçek
      // başlangıç durumuyla değiştir.
      if (label.includes('Dinle') && !label.includes('Sesli Okuma')) {
        setTimeout(() => {
          const panel = findVisibleAudioPanel();
          if (!panel) return;
          const plan = buildSpeechPlan();
          const rate = getPlaybackRate(panel);
          const estimate = estimateSpeechDuration(plan.text, rate);
          activeAudioPanelRef.current = panel;
          speechPlanRef.current = plan;
          ttsInitialDurationRef.current = estimate;
          ttsEstimatedDurationRef.current = estimate;
          ttsProgressRef.current = 0;
          updateAudioPanel(panel, 0, 0, estimate, true);
        }, 60);
        return;
      }

      const audioPanel = getAudioPanel(button);
      if (!audioPanel) return;
      activeAudioPanelRef.current = audioPanel;

      const playButton = getPlayButton(audioPanel);
      const speedButton = getSpeedButton(audioPanel);

      if (button === speedButton) {
        if (ttsActiveRef.current) {
          // React önce butondaki hızı değiştirsin; sonra aktif paragrafın
          // başından yeni hızla native TTS'yi yeniden başlat.
          setTimeout(() => {
            const nextRate = getPlaybackRate(audioPanel);
            void restartAtCurrentParagraphWithRate(nextRate);
          }, 80);
        } else {
          setTimeout(() => {
            const plan = buildSpeechPlan();
            const nextRate = getPlaybackRate(audioPanel);
            const estimate = estimateSpeechDuration(plan.text, nextRate);
            speechPlanRef.current = plan;
            ttsInitialDurationRef.current = estimate;
            ttsEstimatedDurationRef.current = estimate;
            updateAudioPanel(audioPanel, 0, 0, estimate, true);
          }, 80);
        }
        return;
      }

      if (button === playButton) {
        // Native onDone sonrası programatik click yalnızca React ikonunu normale döndürür.
        if (ttsFinishingRef.current) return;

        if (ttsActiveRef.current) {
          await stopTtsSafely(true);
          return;
        }

        const plan = buildSpeechPlan();
        const rate = getPlaybackRate(audioPanel);
        activeAudioPanelRef.current = audioPanel;
        await beginSpeech(plan, rate);
        return;
      }

      // Player X butonu.
      if (button.className.includes('p-1.5') && button.className.includes('rounded-full')) {
        void stopTtsSafely(true);
      }
    };

    const markManualScroll = () => {
      lastManualScrollAtRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) void stopTtsSafely();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchmove', markManualScroll, { passive: true });
    document.addEventListener('wheel', markManualScroll, { passive: true });

    return () => {
      disposed = true;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchmove', markManualScroll);
      document.removeEventListener('wheel', markManualScroll);
      clearElapsedTimer();
      clearParagraphHighlight();
      removeHighlightStyle();
      if (listenerHandle) void listenerHandle.remove();
      void stopStorySpeech().catch(() => {});
    };
  }, [toast]);

  return null;
}
