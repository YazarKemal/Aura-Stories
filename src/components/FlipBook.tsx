'use client';

import { useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { cn } from '@/lib/utils';

type ReadingTheme = 'light' | 'sepia' | 'dark';
type LineSpacing = 'narrow' | 'normal' | 'wide';
type FontFamily = 'system' | 'bitter' | 'alef';

interface FlipBookProps {
  /** Tüm içerik paragrafları (sıralı) */
  paragraphs: string[];
  fontSize: number;
  lineSpacing: LineSpacing;
  readingTheme: ReadingTheme;
  fontFamily: FontFamily;
  isDyslexic: boolean;
  /** Her sayfada gösterilecek maksimum yaklaşık karakter sayısı */
  charsPerPage?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Paragrafları, tahmini karakter sayısına göre sayfalara böler.
 * Bir paragraf sayfaya sığmazsa bölünür.
 */
function paginateContent(paragraphs: string[], charsPerPage: number): string[][] {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentCharCount = 0;

  for (const para of paragraphs) {
    const paraLen = para.length;

    // Eğer paragraf tek başına bir sayfayı aşarsa, böl
    if (paraLen > charsPerPage) {
      // Önce mevcut sayfayı kapat
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentCharCount = 0;
      }

      // Uzun paragrafı chunk'lara böl
      let remaining = para;
      while (remaining.length > 0) {
        // Cümle sınırında bölmeye çalış
        let splitAt = Math.min(charsPerPage, remaining.length);
        if (splitAt < remaining.length) {
          const sentenceBreak = remaining.lastIndexOf('.', splitAt);
          const commaBreak = remaining.lastIndexOf(',', splitAt);
          const spaceBreak = remaining.lastIndexOf(' ', splitAt);
          const bestBreak = sentenceBreak > charsPerPage * 0.6
            ? sentenceBreak + 1
            : commaBreak > charsPerPage * 0.5
              ? commaBreak + 1
              : spaceBreak > charsPerPage * 0.4
                ? spaceBreak
                : splitAt;
          splitAt = bestBreak > 0 ? bestBreak : splitAt;
        }
        pages.push([remaining.slice(0, splitAt).trim()]);
        remaining = remaining.slice(splitAt).trim();
      }
      continue;
    }

    // Bu paragraf mevcut sayfaya sığar mı?
    if (currentCharCount + paraLen > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentCharCount = 0;
    }

    currentPage.push(para);
    currentCharCount += paraLen;
  }

  // Son sayfayı ekle
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

const themePageBg: Record<ReadingTheme, string> = {
  light: 'bg-white text-foreground/90',
  sepia: 'bg-[#f4ecd8] text-[#5b4636]',
  dark: 'bg-[#1a1a1a] text-gray-300',
};

export function FlipBook({
  paragraphs,
  fontSize,
  lineSpacing,
  readingTheme,
  fontFamily,
  isDyslexic,
  charsPerPage,
  onPageChange,
}: FlipBookProps) {
  // Font boyutuna göre sayfa başına karakter tahmini
  const estimatedCharsPerPage = charsPerPage ?? useMemo(() => {
    // Yaklaşık: mobil ekranda (350px genişlik), fontSize px → chars/line, ~18 line/page
    const charsPerLine = Math.floor(320 / (fontSize * 0.6));
    const linesPerPage = Math.floor(400 / (fontSize * (isDyslexic ? 2 : { narrow: 1.4, normal: 1.7, wide: 2.1 }[lineSpacing])));
    return Math.floor(charsPerLine * linesPerPage * 0.85); // %85 kullanım
  }, [fontSize, lineSpacing, isDyslexic]);

  const pages = useMemo(
    () => paginateContent(paragraphs, estimatedCharsPerPage),
    [paragraphs, estimatedCharsPerPage]
  );

  const lineHeight = isDyslexic
    ? '2'
    : { narrow: '1.4', normal: '1.7', wide: '2.1' }[lineSpacing];

  const fontFamilyStyle = isDyslexic
    ? undefined
    : {
        system: undefined,
        bitter: '"Bitter", Georgia, "Times New Roman", serif',
        alef: '"Alef", "Segoe UI", Tahoma, sans-serif',
      }[fontFamily];

  return (
    <div className="flex items-center justify-center w-full h-full">
      {/*
        react-pageflip'in kendi container'ına genişlik/yükseklik veriyoruz.
        size="stretch" ile parent'a uyumlu hale geliyor.
      */}
      <HTMLFlipBook
        startPage={0}
        width={350}
        height={500}
        size="stretch"
        minWidth={280}
        maxWidth={500}
        minHeight={360}
        maxHeight={700}
        drawShadow
        showPageCorners
        flippingTime={800}
        usePortrait={false}
        startZIndex={0}
        autoSize
        maxShadowOpacity={0.5}
        showCover={false}
        mobileScrollSupport
        clickEventForward
        useMouseEvents
        disableFlipByClick={false}
        swipeDistance={30}
        style={{}}
        className=""
        onFlip={(e: any) => {
          onPageChange?.(e.data);
        }}
      >
        {pages.map((pageParagraphs, pageIdx) => (
          <div
            key={pageIdx}
            className={cn(
              'p-5 flex flex-col gap-3 overflow-y-auto',
              themePageBg[readingTheme]
            )}
            style={{
              fontFamily: fontFamilyStyle,
            }}
          >
            {/* Sayfa numarası */}
            <span className="text-[9px] font-bold text-muted-foreground/40 text-right select-none">
              {pageIdx + 1}
            </span>

            {pageParagraphs.map((para, pIdx) => (
              <p
                key={pIdx}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  letterSpacing: isDyslexic ? '0.05em' : 'normal',
                  fontFamily: fontFamilyStyle,
                }}
                className={cn(
                  'leading-relaxed transition-all duration-500',
                  !isDyslexic && fontFamily === 'system' && 'font-serif',
                  pageIdx === 0 && pIdx === 0 && 'first-letter:text-4xl first-letter:font-headline first-letter:mr-1 first-letter:float-left'
                )}
              >
                {para}
              </p>
            ))}

            {/* Alt kenar sayfa numarası */}
            <div className="mt-auto pt-4">
              <span className="text-[9px] font-bold text-muted-foreground/30 select-none">
                {pageIdx + 1} / {pages.length}
              </span>
            </div>
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}
