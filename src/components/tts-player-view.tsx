'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  addTtsProgressListener,
  speakStoryText,
  stopStorySpeech,
  type TtsProgressEvent,
} from '@/lib/native-tts';
import type { Story } from '@/lib/types';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Sparkles } from 'lucide-react';

export interface TtsPlayerProps {
  open: boolean;
  story: Story;
  chapterNumber: number;
  /** Deterministik paragraf listesi — oynatıcı tek gerçek kaynaktır. */
  paragraphs: string[];
  onBack: () => void;
}

interface TtsSegment {
  text: string;
  start: number;
  end: number;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];
const WORDS_PER_MINUTE = 122;

function buildSegments(paragraphs: string[]): TtsSegment[] {
  const segments: TtsSegment[] = [];
  let cursor = 0;
  paragraphs.forEach((paragraph, index) => {
    const text = paragraph.trim();
    if (!text) return;
    if (index > 0) cursor += 2; // '\n\n'
    const start = cursor;
    cursor += text.length;
    segments.push({ text, start, end: cursor });
  });
  return segments;
}

/** Kelime ortasında kalındıysa en yakın geçerli kelime başına geri kay.
 *  Asla hikayeyi başa sarmaz; yalnızca tek kelimelik güvenli geri sarma yapılabilir. */
function normalizeToWordBoundary(text: string, offset: number): number {
  const length = text.length;
  if (offset <= 0) return 0;
  if (offset >= length - 1) return offset;
  if (/\s/.test(text[offset])) return offset;

  const previousSpace = text.lastIndexOf(' ', offset);
  const nextSpace = text.indexOf(' ', offset);
  const wordStart = previousSpace < 0 ? 0 : previousSpace + 1;
  const distanceToStart = offset - wordStart;
  const distanceToEnd = nextSpace < 0 ? Number.POSITIVE_INFINITY : nextSpace - offset;

  if (distanceToStart <= distanceToEnd) return wordStart;
  return nextSpace < 0 ? offset : nextSpace + 1;
}

function segmentIndexForOffset(segments: TtsSegment[], offset: number): number {
  if (!segments.length) return 0;
  let index = segments.findIndex((segment) => offset >= segment.start && offset < segment.end);
  if (index < 0 && offset >= segments[segments.length - 1].end) index = segments.length - 1;
  return Math.max(0, index);
}

function estimateSpeechDuration(words: number, rate: number): number {
  return Math.max(1, (words / (WORDS_PER_MINUTE * Math.max(0.5, rate))) * 60);
}

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function TtsPlayerView({ open, story, chapterNumber, paragraphs, onBack }: TtsPlayerProps) {
  const { toast } = useToast();

  const segments = useMemo(() => buildSegments(paragraphs), [paragraphs]);
  const fullText = useMemo(() => segments.map((segment) => segment.text).join('\n\n'), [segments]);

  // ── Tek playback sahibi: tüm TTS durumu bu bileşendedir ─────
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [globalOffset, setGlobalOffset] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const rateRef = useRef(1);
  const playingRef = useRef(false);
  const speechBaseOffsetRef = useRef(0);
  const globalOffsetRef = useRef(0);
  const startedAtRef = useRef(0);
  const elapsedBeforeRef = useRef(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const planRef = useRef({ segments, fullText });
  planRef.current = { segments, fullText };

  const totalWords = useMemo(
    () => fullText.trim().split(/\s+/).filter(Boolean).length,
    [fullText]
  );
  const totalEstimate = estimateSpeechDuration(totalWords, rate);
  const progressPercent = totalWords > 0
    ? Math.max(0, Math.min(100, (globalOffset / Math.max(1, fullText.length)) * 100))
    : 0;

  const currentSegment = segments[currentSegmentIndex] || segments[0] || null;

  const clearElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  const stopNativeSafely = async () => {
    try {
      await stopStorySpeech();
    } catch (error) {
      console.warn('[TtsPlayer] Ses durdurulamadı:', error);
    }
  };

  /** TTS'yi offset'ten başlatır. speechBaseOffsetRef bu çağrıda güncellenir;
   *  progress olayları globalOffset = base + nativeStart olarak hesaplar. */
  const beginSpeech = useCallback(async (offset: number) => {
    const { segments: segs, fullText: text } = planRef.current;
    if (!text) return;

    const safeOffset = Math.max(0, Math.min(offset, Math.max(0, text.length - 1)));
    const normalized = normalizeToWordBoundary(text, safeOffset);
    speechBaseOffsetRef.current = normalized;
    globalOffsetRef.current = normalized;
    setGlobalOffset(normalized);
    setCurrentSegmentIndex(segmentIndexForOffset(segs, normalized));

    await speakStoryText(text.slice(normalized), rateRef.current);
    playingRef.current = true;
    setIsPlaying(true);
    startedAtRef.current = Date.now();
    clearElapsedTimer();
    elapsedTimerRef.current = setInterval(() => {
      if (!playingRef.current) return;
      setElapsedSeconds(elapsedBeforeRef.current + Math.max(0, (Date.now() - startedAtRef.current) / 1000));
    }, 400);
  }, []);

  /** Duraklat: globalOffset korunur, ses durdurulur. */
  const pauseSpeech = useCallback(async () => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setIsPlaying(false);
    elapsedBeforeRef.current += Math.max(0, (Date.now() - startedAtRef.current) / 1000);
    startedAtRef.current = 0;
    clearElapsedTimer();
    setElapsedSeconds(elapsedBeforeRef.current);
    await stopNativeSafely();
  }, []);

  /** Hız değişimi: son globalOffset korunur; kalan metin o noktadan okunur. */
  const changeRate = useCallback(async (next: number) => {
    if (next === rateRef.current) return;
    rateRef.current = next;
    setRate(next);
    const preserved = globalOffsetRef.current;
    if (playingRef.current) {
      await stopNativeSafely();
      await beginSpeech(preserved);
    }
  }, [beginSpeech]);

  /** Önceki/sonraki paragraf: deterministik segment sınırlarından başlar. */
  const skipToSegment = useCallback(async (index: number) => {
    const { segments: segs } = planRef.current;
    if (!segs.length) return;
    const clamped = Math.max(0, Math.min(index, segs.length - 1));
    if (playingRef.current) await stopNativeSafely();
    setCurrentSegmentIndex(clamped);
    await beginSpeech(segs[clamped].start);
  }, [beginSpeech]);

  const togglePlayPause = useCallback(async () => {
    if (playingRef.current) {
      await pauseSpeech();
    } else {
      await beginSpeech(globalOffsetRef.current);
    }
  }, [pauseSpeech, beginSpeech]);

  const handleBack = useCallback(async () => {
    playingRef.current = false;
    setIsPlaying(false);
    elapsedBeforeRef.current = 0;
    startedAtRef.current = 0;
    clearElapsedTimer();
    await stopNativeSafely();
    onBack();
  }, [onBack]);

  // Native progress listener — tek kurulum, ref üzerinden okur.
  useEffect(() => {
    let disposed = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const handleProgress = (event: TtsProgressEvent) => {
      const { segments: segs, fullText: text } = planRef.current;
      if (!playingRef.current) return;

      if (event.state === 'error') {
        playingRef.current = false;
        setIsPlaying(false);
        clearElapsedTimer();
        toast({
          title: 'Sesli okuma durdu',
          description: 'Android ses motoru okumayı tamamlayamadı.',
          variant: 'destructive',
        });
        return;
      }

      if (event.state === 'done') {
        playingRef.current = false;
        setIsPlaying(false);
        elapsedBeforeRef.current += Math.max(0, (Date.now() - startedAtRef.current) / 1000);
        startedAtRef.current = 0;
        clearElapsedTimer();
        globalOffsetRef.current = text.length;
        setGlobalOffset(text.length);
        setCurrentSegmentIndex(segs.length - 1);
        setElapsedSeconds(elapsedBeforeRef.current);
        return;
      }

      if (event.state !== 'progress' || !text) return;

      // Android onRangeStart, dilimlenmiş metin İÇİNDEKİ offset'i verir.
      // Global konum = konuşma taban offset'i + native aralık başlangıcı.
      const nativeLength = Math.max(1, event.length || 1);
      const nativeStart = Math.max(0, Math.min(nativeLength, event.start));
      const global = Math.min(text.length, speechBaseOffsetRef.current + nativeStart);
      globalOffsetRef.current = global;
      setGlobalOffset(global);
      setCurrentSegmentIndex(segmentIndexForOffset(segs, global));
    };

    void addTtsProgressListener(handleProgress).then((handle) => {
      if (disposed) {
        if (handle) void handle.remove();
        return;
      }
      listenerHandle = handle;
    }).catch((error) => {
      console.warn('[TtsPlayer] Progress listener kurulamadı:', error);
    });

    return () => {
      disposed = true;
      clearElapsedTimer();
      playingRef.current = false;
      if (listenerHandle) void listenerHandle.remove();
      void stopStorySpeech().catch(() => {});
    };
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) void handleBack(); }}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 z-[400] w-screen h-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-transparent p-0 shadow-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300"
      >
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#1D1231] via-[#0B070F] to-[#1D1231] flex flex-col">
          {/* Dekoratif ışık */}
          <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

          {/* Header */}
          <header className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-2">
            <button
              data-aura-close
              aria-label="Geri dön"
              onClick={() => void handleBack()}
              className="flex items-center gap-2 p-2 -ml-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors active:scale-90"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sesli Okuma</span>
              <span className="text-[11px] font-bold text-zinc-400">Bölüm {chapterNumber}</span>
            </div>
          </header>

          {/* Kapak + meta */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-8 min-h-0">
            <div className="relative w-44 h-60 sm:w-52 sm:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <Image src={story.imageUrl} alt={story.title} fill className="object-cover" />
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <h2 className="text-2xl font-headline font-black text-white tracking-tight leading-tight max-w-xs">
                {story.title}
              </h2>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{story.author}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Paragraf {currentSegmentIndex + 1} / {Math.max(1, segments.length)}
            </div>

            {/* Paragraf önizleme */}
            <div className="w-full max-w-md max-h-28 overflow-y-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 no-scrollbar">
              <p className="text-sm font-serif italic text-zinc-200 leading-relaxed">
                {currentSegment ? currentSegment.text : 'Okunacak metin bulunamadı.'}
              </p>
            </div>

            {/* Progress */}
            <div className="w-full max-w-md flex flex-col gap-2">
              <div className="relative h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 tabular-nums px-1">
                <span>{formatClock(elapsedSeconds)}</span>
                <span>~{formatClock(totalEstimate)}</span>
              </div>
            </div>

            {/* Kontroller */}
            <div className="flex items-center justify-center gap-10">
              <button
                onClick={() => void skipToSegment(currentSegmentIndex - 1)}
                disabled={currentSegmentIndex <= 0}
                aria-label="Önceki paragraf"
                className="text-zinc-300 hover:text-white transition-colors active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>
              <button
                onClick={() => void togglePlayPause()}
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying
                  ? <Pause className="w-9 h-9 fill-current" />
                  : <Play className="w-9 h-9 fill-current ml-1" />}
              </button>
              <button
                onClick={() => void skipToSegment(currentSegmentIndex + 1)}
                disabled={currentSegmentIndex >= segments.length - 1}
                aria-label="Sonraki paragraf"
                className="text-zinc-300 hover:text-white transition-colors active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>
            </div>

            {/* Hız seçimi */}
            <div className="flex items-center gap-2">
              {RATES.map((option) => (
                <button
                  key={option}
                  onClick={() => void changeRate(option)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[11px] font-black transition-all active:scale-95',
                    rate === option
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {option}x
                </button>
              ))}
            </div>
          </div>

          {/* Alt boşluk — Android gesture bar güvenliği */}
          <div className="h-8" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
